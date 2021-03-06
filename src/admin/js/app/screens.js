var Class = require('class').Class,
	Backbone = require('backbone')
	View = Backbone.View;


var Screens = new Class({
	extend: View,
	
	templateName: '{name}.html',
	
	constructor: function(element, screens) {
		this.el = $(element);
		this.$('> *').hide();
		this.screens = {};
		this.titles = {};
		if (screens) {
			for (var name in screens) {
				if (!screens.hasOwnProperty(name)) continue;
				this.screens[name] = $(screens[name]);
			}
		}
	},
	
	at: function(screen) {
		var screens = screen.split('/'),
			basescreen = screens.shift(),
			subscreen = screens.shift();
		
		if (this.screens.hasOwnProperty(basescreen) && (basescreen = this.screens[basescreen]).filter(':visible').length) {
			if (!subscreen || basescreen.find('.screens > .' + subscreen + ':visible').length) {
				return true;
			}
		}
		return false;
	},
	
	go: function(screen) {
		location.hash = '#/' + screen;
	},
	
	/**
	 * Open a screen by the given name, if not loaded yet will load first
	 * @param name The screen name
	 * @param data Data to pass into the "show" event of the screen
	 * @return This object
	 */
	open: function(name, data) {
		var basescreen = name.split('/').shift();
		
		if (!this.screens.hasOwnProperty(basescreen)) {
			var self = this;
			this.load(basescreen).then(function() {
				self._open(name, data);
			});
		} else {
			this._open(name, data);
		}
		return this;
	},
	
	/**
	 * Loads a screen by name
	 * @param name
	 */
	load: function(name) {
		var url = this.templateName.replace(/\{\s*name\s*\}/g, name), self = this;
		var screen = $('<div class="screen loading"></div>').attr('id', name).appendTo(this.el);
		self.screens[name] = screen;
		self.trigger('created:' + name, screen);
		self.trigger('created', name, screen);
		
		return $.ajax({ url: url, dataType: 'html' }).then(function(result) {
			var bod = result.indexOf('<body');
			if (bod !== -1) {
				var title = (result.match(/<title>([^<]+)<\/title>/) || {1: 'Static Site CMS'})[1];
				var bodStart = result.indexOf('>', bod) + 1;
				var bodEnd = result.lastIndexOf('</body>');
				self.titles[name] = title;
				result = result.slice(bodStart, bodEnd);
			}
			result = result.replace(/<script.+?<\/script>/g, '');
			screen.html(result).removeClass('loading').hide().find('.screens > :not(:first-child)').hide();
			self.trigger('load:' + name, screen);
			self.trigger('load', name, screen);
			
			try {
				require('screens/' + name);
			} catch(e) {}
			
			return screen;
		});
	},
	
	_open: function(name, data) {
		var screens = name.split('/'), self = this;
		var basescreen = screens.shift(), subscreen = screens.shift();
		var screen = this.screens[basescreen], sub = subscreen ? screen.find('.screens > .' + subscreen) : screen.find('.screens > :first');
		if (this.titles.hasOwnProperty(basescreen)) document.title = this.titles[basescreen];
		var baseOpened = false;
		
		if (!screen.filter(':visible').length) {
			screen.siblings(':visible').hide().trigger('hide').each(function() {
				self.trigger('close', $(this));
			});
			
			screen.show().trigger('show', [data]);
			this.trigger('open:' + basescreen, screen);
			this.trigger('open', basescreen, screen);
			baseOpened = true;
		}
		
		if (sub.length && (baseOpened || !sub.filter(':visible').length)) {
			if (!sub.filter(':visible').length) {
				sub.siblings(':visible').hide();
				sub.show();
			}
			this.trigger('open:' + name, sub);
			this.trigger('open', name, sub);
		}
	}
});



var screens = module.exports = new Screens('#screens');
screens.bind('open', function(name) {
	$('body').attr('class', name.split('/').shift());
});



var history = Backbone.history = new Backbone.History();
history.route(/.*/, function(screen) {
	if (screen.slice(0, 1) === '/') screens.open(screen.slice(1));
	else if (screen == '') screens.go('dashboard');
});
history.start();