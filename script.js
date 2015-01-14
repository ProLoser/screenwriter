var types = ['scene', 'action', 'character', 'dialogue', 'parenthetical', 'transition', 'shot', 'text'];
var nextTypes = {
    scene: 'action',
    action: 'action',
    character: 'dialogue',
    dialogue: 'character',
    parenthetical: 'dialogue',
    transition: 'scene',
    shot: 'action',
    text: 'text'
};

var StopPropagationMixin = {
	stopProp: function(event) {
		event.nativeEvent.stopImmediatePropagation();
	},
};
function cursorPos(element) {
    var caretOffset = 0;
    var doc = element.ownerDocument || element.document;
    var win = doc.defaultView || doc.parentWindow;
    var sel;
    if (typeof win.getSelection != "undefined") {
        sel = win.getSelection();
        if (sel.rangeCount > 0) {
            var range = win.getSelection().getRangeAt(0);
            var preCaretRange = range.cloneRange();
            preCaretRange.selectNodeContents(element);
            preCaretRange.setEnd(range.endContainer, range.endOffset);
            caretOffset = preCaretRange.toString().length;
        }
    } else if ( (sel = doc.selection) && sel.type != "Control") {
        var textRange = sel.createRange();
        var preCaretTextRange = doc.body.createTextRange();
        preCaretTextRange.moveToElementText(element);
        preCaretTextRange.setEndPoint("EndToEnd", textRange);
        caretOffset = preCaretTextRange.text.length;
    }
    return caretOffset;
};

function placeCaretAtEnd(el) {
    el.focus();
    if (typeof window.getSelection != "undefined"
            && typeof document.createRange != "undefined") {
        var range = document.createRange();
        range.selectNodeContents(el);
        range.collapse(false);
        var sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
    } else if (typeof document.body.createTextRange != "undefined") {
        var textRange = document.body.createTextRange();
        textRange.moveToElementText(el);
        textRange.collapse(false);
        textRange.select();
    }
}

function S4() {
   return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
}
function guid() {
   return (S4()+S4()+"-"+S4()+"-"+S4()+"-"+S4()+"-"+S4()+S4()+S4());
}


var Script = React.createClass({displayName: "Script",
	mixins: [ReactFireMixin, ReactRouter.State],
	getInitialState: function() {
		highlight = '';

		return {
			scriptId: this.getParams().scriptId,
			script: {},
			editing: {}
		};
	},
	componentWillMount: function() {
		this.bindAsObject(new Firebase("https://screenwrite.firebaseio.com/"+this.state.scriptId), "script");
	},
	componentDidMount: function() {
		// CLEANUP OLD DATA
		var fb = new Firebase("https://screenwrite.firebaseio.com/"+this.state.scriptId);
		fb.once('value', (function(snapshot){
			if (!snapshot.val()) {
				fb.set({});
				var newLine = fb.child('lines').push({ type: 'scene' });
				fb.update({ firstLine: newLine.key() });
				return;
			}
			if (snapshot.val().firstLine) return;
			var previous, previousIndex;
			fb.update({firstLine: '0'});
			_.each(snapshot.val().lines, function(line, index) {
				if (previous) {
					fb.child('lines/'+previousIndex+'/next').set(index);
				}
				previous = line;
				previousIndex = index;
			});
		}).bind(this));

		window.onunload = (function(){
			if (_.keys(this.state.script.lines).length <= 2 || !this.state.script.title)
				fb.remove();
		}).bind(this);
	},
	editing: function(line) {
		this.setState({editing:line});
	},
	getSuggestion: function(lineIndex) {
		if (!this.state.script.lines[lineIndex].text) return '';
		var type = this.state.script.lines[lineIndex].type;
		var text = this.state.script.lines[lineIndex].text.toUpperCase();

		var suggestions = [];
		var iterate = (function(index){
		    var line = this.state.script.lines[index];
			if (line.type == type
			    && line.text
			    && line.text.length > text.length
			    && line.text.toUpperCase().indexOf(text) === 0)
				suggestions.push(line.text.toUpperCase());
			if (index != lineIndex && line.next)
				iterate(line.next);
		}).bind(this);
		iterate(this.state.script.firstLine);
		return (suggestions.pop() || '').substr(text.length);
	},
	handleKey: function(event, line, index, prevIndex, prevPrevIndex) {
		switch (event.keyCode) {
			case 39: // right
				if ((line.type == 'character' || line.type == 'scene') && cursorPos(event.target) >= event.target.textContent.length) {
					var suggestion;
					if (suggestion = this.getSuggestion(index)) {
						this.firebaseRefs.script.child('lines/'+index).update({ text: line.text + suggestion });
						this.refs['line'+index].focus(true);
					}
				}
				break;
            case 38: // up
                if (prevIndex) {
	                if (event.metaKey || event.ctrlKey) {
	                	// [a, b, C, d] => [a, C, b, d]
	                	// A points to C
	                	if (prevPrevIndex)
		                	this.firebaseRefs.script.child('lines/'+prevPrevIndex).update({next: index});
		                else
		                	this.firebaseRefs.script.update({firstLine:index});
                    	// C points to B
                    	var newNext = line.next;
                    	this.firebaseRefs.script.child('lines/'+index).update({next: prevIndex });
                    	// B points to D
                    	if (line.next)
                    		this.firebaseRefs.script.child('lines/'+prevIndex).update({next: newNext });
                    	else
	                    	this.firebaseRefs.script.child('lines/'+prevIndex+'/next').remove();
                        this.refs['line'+index].focus(true);
	                    event.preventDefault();
	                } else if (!cursorPos(event.target)) {
	                    this.refs['line'+prevIndex].focus(true);
	                    event.preventDefault();
	                }
                }
                break;
            case 40: // down
            	if (line.next) {
	                if (event.metaKey || event.ctrlKey) {
			            // [a, b, c, d] => [a, c, b, d]

	                	// A points to C
	                	if (prevIndex)
		                	this.firebaseRefs.script.child('lines/'+prevIndex).update({next: line.next});
		                else
		                	this.firebaseRefs.script.update({firstLine:line.next});
	                	var newNext = this.state.script.lines[line.next].next;
	                	// C points to B
	                	this.firebaseRefs.script.child('lines/'+line.next).update({next: index});
	                	// B points to D
	                	if (newNext)
		                	this.firebaseRefs.script.child('lines/'+index).update({ next: newNext });
		                else
		                	this.firebaseRefs.script.child('lines/'+index+'/next').remove();
	                    this.refs['line'+index].focus();
	                    event.preventDefault();
	                } else if (cursorPos(event.target) >= event.target.textContent.length ) {
	                	this.refs['line'+line.next].focus();
	                    event.preventDefault();
	                }
            	}
                break;
            case 8: // backspace
                if (!line.text && prevIndex) {
                	// update previous line
                	if (line.next)
	                	this.firebaseRefs.script.child('lines/'+prevIndex).update({next:line.next});
	                else
	                	this.firebaseRefs.script.child('lines/'+prevIndex+'/next').remove();

	                // remove line
                    this.firebaseRefs.script.child('lines/'+index).remove();
                    this.refs['line'+prevIndex].focus(true);
                    event.preventDefault();
                }
                break;
            case 13: // enter
                if (line.text) {
                	// create new line pointing to current line's `next`
                	var newItem = { type: nextTypes[line.type] };
                	if (line.next) newItem.next = line.next;
                    newRef = this.firebaseRefs.script.child('lines').push(newItem);
                    // point current line to the new line
                    this.firebaseRefs.script.child('lines/'+index+'/next').set(newRef.key());
                    setTimeout((function(){
                    	this.refs['line'+newRef.key()].focus();
                    }).bind(this));
                }
        }
	},
	render: function() {
		var indexes = {};
		var lines = [];
		var previous, prevPrevious;
		var next = (function(line, index){
			lines.push(
				React.createElement(Line, {line: line, key: index, index: index, ref: 'line'+index, 
					previous: previous, prevPrevious: prevPrevious, 
					onFocus: this.editing.bind(this, index), 
					getSuggestion: this.getSuggestion, 
					onKeyDown: this.handleKey})
			);
			prevPrevious = previous;
			previous = index;
			if (line.next) next(this.state.script.lines[line.next], line.next);
		}).bind(this);

		if (this.state.script && this.state.script.lines && this.state.script.firstLine) {
			next(this.state.script.lines[this.state.script.firstLine], this.state.script.firstLine);
		} else {
			lines = React.createElement("h1", {className: "text-center"}, "Loading Script...")
		}
		return (
			React.createElement("div", null, 
				React.createElement(Nav, {script: this.state.script, editingIndex: this.state.editing}), 
				React.createElement("ul", {className: "script"}, lines)
			)
		);
	}
});

var highlight = '';

var Line = React.createClass({displayName: "Line",
	mixins: [ReactFireMixin, StopPropagationMixin, ReactRouter.State],
	getInitialState: function() {
		return {
			comments: this.props.line.comments,
			commenting: false,
			scriptId: this.getParams().scriptId,
			suggesting: false,
			suggestion: '',
		};
	},
	componentWillMount: function() {
		this.bindAsObject(new Firebase("https://screenwrite.firebaseio.com/"+this.state.scriptId+"/lines/" + this.props.index), "line");
	},
	handleChange: function(event) {
		var updates = { line: { text: event.target.value } }
		if (this.state.suggesting) {
			updates.suggestion = this.props.getSuggestion(this.props.index);
		}
		this.firebaseRefs.line.update({'text':event.target.value});
	},
	handleComment: function(event) {
		this.firebaseRefs.line.update({'comment':event.target.value});
	},
	nextType: function(){
        var index = types.indexOf(this.props.line.type) + 1;
        index = (index < types.length) ? index : 0;
        this.setType(types[index]);
    },
    prevType: function() {
        var index = types.indexOf(this.props.line.type) - 1;
        index = (index >= 0) ? index : types.length - 1;
        this.setType(types[index]);
    },
	setType: function(type) {
		this.firebaseRefs.line.update({type:type});
	},
	handleKey: function(event) {
		switch (event.keyCode) {
            case 13: // enter
	            event.preventDefault();
                if (this.props.line.text) {
                    break;
                }
            case 9: // tab
                event.preventDefault();
                if (event.shiftKey) {
                    this.prevType();
                } else {
                    this.nextType();
                }
        }

		this.props.onKeyDown(event, this.props.line, this.props.index, this.props.previous, this.props.prevPrevious);
	},
	comment: function(event) {
		event.stopPropagation();
		this.setState({ commenting: !this.state.commenting }, function(){
			if (this.state.commenting) {
				var that = this;
				document.addEventListener('click', function listener(){
					that.setState({ commenting: false });
					document.removeEventListener('click', listener);
				});
				this.refs.commentBox.getDOMNode().focus();
			}
		});
	},
	focus: function(atEnd) {
		if (atEnd)
			placeCaretAtEnd(this.refs.text.getDOMNode());
		else
			this.refs.text.getDOMNode().focus();
	},
	onFocus: function(event) {
		this.setState({suggesting:true});
		this.props.onFocus(event);
	},
	onBlur: function(event) {
		this.setState({suggesting:false});
	},
	render: function() {
		return (
			React.createElement("li", {className: 'line '+this.props.line.type+' '+(highlight && this.props.line.text && highlight.toUpperCase()==this.props.line.text.toUpperCase() && 'highlight')}, 
				React.createElement(ContentEditable, {
					ref: "text", 
					html: this.props.line.text, 
					onChange: this.handleChange, 
					onKeyDown: this.handleKey, 
					onFocus: this.onFocus, 
					onBlur: this.onBlur, 
					className: "line-text"}), 
				React.createElement("a", {onClick: this.comment, className: "comment-add"}, 
					React.createElement("i", {className: "glyphicon glyphicon-comment"})
				), 

				this.state.commenting && React.createElement(ContentEditable, {
					ref: "commentBox", 
					onChange: this.handleComment, 
					onClick: this.stopProp, 
					className: "comment-box", 
					html: this.props.line.comment})
			)
		);
	}
});

var ContentEditable = React.createClass({displayName: "ContentEditable",
	stripPaste: function(e){
        // Strip formatting on paste
        var tempDiv = document.createElement("DIV");
        var item = _.findWhere(e.clipboardData.items, { type: 'text/plain' });
        item.getAsString(function (value) {
            tempDiv.innerHTML = value;
            document.execCommand('inserttext', false, tempDiv.innerText);
        });
        e.preventDefault();
	},
    render: function(){
        return React.createElement("div", {
        	ref: "input", 
            onInput: this.emitChange, 
            onBlur: this.emitChange, 
            onKeyDown: this.props.onKeyDown, 
            onClick: this.props.onClick, 
            className: this.props.className, 
			onFocus: this.props.onFocus, 
			onBlur: this.props.onBlur, 
			onPaste: this.stripPaste, 
            contentEditable: true, 
            dangerouslySetInnerHTML: {__html: this.props.html}});
    },
    shouldComponentUpdate: function(nextProps){
        return nextProps.html !== this.getDOMNode().innerHTML;
    },
    emitChange: function(){
        var html = this.getDOMNode().innerHTML;
        if (this.props.onChange && html !== this.lastHtml) {

            this.props.onChange({
                target: {
                    value: html
                }
            });
        }
        this.lastHtml = html;
    }
});

var Nav = React.createClass({displayName: "Nav",
	mixins: [ReactFireMixin, StopPropagationMixin, ReactRouter.State],
	getInitialState: function() {
		return {
			open: null,
			script: {},
			scriptId: this.getParams().scriptId,
			highlight: ''
		};
	},
	componentWillMount: function() {
		this.bindAsObject(new Firebase("https://screenwrite.firebaseio.com/"+this.state.scriptId), "script");
	},
	toggle: function(dropdown, event) {
		var that = this;
		if (this.state.open != dropdown) {
			setTimeout((function(){
				document.addEventListener('click', function listener(){
					that.setState({ open: false });
					document.removeEventListener('click', listener);
				});
				this.setState({ open: dropdown });
			}).bind(this));
		}
	},
	setType: function(type) {
		if (!this.props.editingIndex) return;
		this.firebaseRefs.script.child('lines/'+this.props.editingIndex+'/type').set(type);
	},
	print: function() {
		window.print();
	},
	highlight: function(event) {
		highlight = event.target.value;
		this.setState({highlight: event.target.value});
	},
	handleChange: function(input, event) {
		this.firebaseRefs.script.child(input).set(event.target.value);
	},
	newScript: function(){
		var fb = new Firebase("https://screenwrite.firebaseio.com/");
		var newRef = fb.push();
		window.location.hash = '#/' + newRef.key();
		window.location.reload(); // force firebase to reload
	},
	render: function() {
		if (!this.state.script) return React.createElement("div", null);
		var editing = this.state.script.lines && this.state.script.lines[this.props.editingIndex] || {};
		if (this.state.open=='print') {
			var characters = [];
			_.each(_.uniq(_.map(_.pluck(_.where(this.state.script.lines, {type:'character'}), 'text'), function(character){
				return character && character.toUpperCase();
			})), function(character){
				if (character)
					characters.push(React.createElement("option", {key: character}, character))
			});
		}
		return (
			React.createElement("div", null, 
				React.createElement("div", {className: "navbar navbar-inverse navbar-fixed-top hidden-print", role: "navigation"}, 
					React.createElement("div", {className: "container"}, 
						React.createElement("ul", {className: "nav navbar-nav btn-block row"}, 
							React.createElement("li", {className: "col-sm-6 col-xs-12 navbar-btn dropdown"}, 
								React.createElement("div", {className: "input-group"}, 
									React.createElement("input", {type: "text", className: "form-control text-center", value: this.state.script.title, onChange: this.handleChange.bind(this,'title'), placeholder: "Script Title"}), 
									React.createElement("span", {className: "input-group-btn"}, 
										React.createElement("a", {className: 'btn btn-default ' + (this.state.dropdowns=='print'&&'active'), onClick: this.toggle.bind(this,'print'), title: "Print Options"}, 
											React.createElement("i", {className: "glyphicon glyphicon-print"})
										), 
										React.createElement("a", {className: "btn btn-default", onClick: this.newScript, title: "New Script"}, 
											React.createElement("i", {className: "glyphicon glyphicon-plus"})
										)
									)
								), 
								this.state.open == 'print' && React.createElement("div", {className: "popover bottom", style:  { display: 'block'}, onClick: this.stopProp}, 
									React.createElement("div", {className: "arrow"}), 
									React.createElement("h3", {className: "popover-title btn btn-block", onClick: this.print}, "Print"), 
									React.createElement("div", {className: "popover-content"}, 
										React.createElement("div", {className: "form-group"}, 
											React.createElement("textarea", {placeholder: "Author(s)", value: this.state.script.authors, onChange: this.handleChange.bind(this,'authors'), className: "form-control"})
										), 
										React.createElement("div", {className: "form-group"}, 
											React.createElement("textarea", {placeholder: "Address (left side)", value: this.state.script.leftAddress, onChange: this.handleChange.bind(this,'leftAddress'), className: "form-control"})
										), 
										React.createElement("div", {className: "form-group"}, 
											React.createElement("textarea", {placeholder: "Address (right side)", value: this.state.script.rightAddress, onChange: this.handleChange.bind(this,'rightAddress'), className: "form-control"})
										), 
										React.createElement("div", {className: "form-group"}, 
											React.createElement("select", {className: "form-control", onChange: this.highlight, title: "Highlights a character when printing", value: this.state.highlight}, 
												React.createElement("option", {value: ""}, "-- Character --"), 
												characters
											)
										)
									)
								)
							), 
							React.createElement("li", {className: 'col-sm-6 col-xs-12 dropdown ' + (this.state.g=='line'&&'open')}, 
								React.createElement("a", {onClick: this.toggle.bind(this, 'line')}, 
									React.createElement("i", {className: "glyphicon glyphicon-align-center"}), 
									React.createElement("span", {className: "uppercase"}, " ", editing.type || 'Line Type', " "), 
									React.createElement("b", {className: "caret"})
								), 
								this.state.open == 'line' && React.createElement("div", {className: "popover bottom", style:  { display: 'block'} }, 
									React.createElement("div", {className: "arrow"}), 
									React.createElement("div", {className: "list-group uppercase popover-content text-center"}, 
										types.map(function(type){
											return React.createElement("a", {onClick: this.setType.bind(this, type), 
												key: type, 
												className: 'list-group-item '+(editing.type==type&&'active')}, 
												type
											)
										}, this)
									)
								)
							)
						)
					)
				), 
				React.createElement("header", {className: "visible-print"}, 
					React.createElement("p", {className: "uppercase"}, this.props.script.title), 
					this.props.script.authors && React.createElement("p", null, "by"), 
					React.createElement("p", null, this.props.script.authors), 
					this.state.highlight && React.createElement("p", {className: "character-highlighted"}, "Character: ", this.state.highlight.toUpperCase()), 
					React.createElement("address", {className: "text-left"}, this.props.script.leftAddress), 
					React.createElement("address", {className: "text-right"}, this.props.script.rightAddress)
				)
			)
		);
	}
});

var Home = React.createClass({displayName: "Home",
	newScript: function(){
		var fb = new Firebase("https://screenwrite.firebaseio.com/");
		var newRef = fb.push();
		window.location.hash = '#/' + newRef.key();
		window.location.reload(); // force firebase to reload
	},
	render: function() {
		var commentStyles = {
			color: '#dd0',
			textShadow: '0 1px 1px #000',
			fontSize: '120%'
		};
		return (
		        React.createElement("div", null, 

			        React.createElement("div", {className: "text-center"}, 

				        React.createElement("h1", null, "Screenwriter"), 
				        React.createElement("p", null, 
					        React.createElement("a", {className: "btn btn-primary", onClick: this.newScript}, React.createElement("i", {className: "glyphicon glyphicon-plus"}), " New Script"), 
					        " ", 
					        React.createElement(Link, {className: "btn btn-primary", to: "/demo"}, "Demo Script")
				        ), 

				        React.createElement("p", null, 
					        React.createElement("a", {className: "btn btn-default", href: "https://github.com/ProLoser/screenwriter"}, React.createElement("img", {src: "github-icons/GitHub-Mark-32px.png", alt: "Github"}), " Source Code")
				        )
			        ), 

			        React.createElement("h3", null, "Collaborate:"), 
			        React.createElement("p", null, "Share your custom URL with friends to collaborate!"), 

			        React.createElement("h3", null, "Shortcuts:"), 
			        React.createElement("p", null, 
				        React.createElement("strong", null, "Enter"), " Insert new line", React.createElement("br", null), 
				        React.createElement("strong", null, "(Shift+)Tab"), " Cycle through line types", React.createElement("br", null), 
				        React.createElement("strong", null, "Up/Down"), " Move through lines", React.createElement("br", null), 
				        React.createElement("strong", null, "Cmd/Ctrl+Up/Down"), " Reorder lines", React.createElement("br", null), 
				        React.createElement("strong", null, "Shift+Enter"), " To select the top of the autocomplete suggestions", React.createElement("br", null)
			        ), 

			        React.createElement("h3", null, "Comments:"), 
			        React.createElement("p", {className: "help"}, "Hover over a line and click comment button ", React.createElement("i", {className: "glyphicon glyphicon-comment", style: commentStyles}))
		        )
		);
	}

});

var App = React.createClass({displayName: "App",
	render: function() {
		return React.createElement(RouteHandler, null);
	}
});

Route = ReactRouter.Route;
Link = ReactRouter.Link;
RouteHandler = ReactRouter.RouteHandler;
DefaultRoute = ReactRouter.DefaultRoute;
var routes = (
	React.createElement(Route, {handler: App}, 
		React.createElement(DefaultRoute, {handler: Home}), 
		React.createElement(Route, {name: "script", path: "/:scriptId", handler: Script}
		)
	)
);


ReactRouter.run(routes, function (Handler) {
  React.render(React.createElement(Handler, null), document.getElementById('container'));
});