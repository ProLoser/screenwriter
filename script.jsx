import { createRoot } from 'react-dom/client';
import { HashRouter, Routes, Route, Link, useParams } from 'react-router';
import { useState, useEffect, useRef, forwardRef, useImperativeHandle, useLayoutEffect, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref as dbRef, onValue, set, push, update, remove } from 'firebase/database';

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

// Firebase setup using the modern modular SDK
var firebaseApp = initializeApp({ databaseURL: 'https://screenwrite.firebaseio.com' });
var db = getDatabase(firebaseApp);

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
}

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

// ContentEditable component – keeps cursor stable while user types
var ContentEditable = forwardRef(function ContentEditable(props, ref) {
	var html = props.html;
	var onChange = props.onChange;
	var onKeyDown = props.onKeyDown;
	var onClick = props.onClick;
	var className = props.className;
	var onFocus = props.onFocus;
	var onBlur = props.onBlur;
	var suggest = props.suggest;

	var domRef = useRef(null);
	var lastHtml = useRef(html || '');

	var setRef = function(el) {
		domRef.current = el;
		if (typeof ref === 'function') ref(el);
		else if (ref) ref.current = el;
	};

	// Sync the html prop to the DOM only when it differs from what is already there.
	// Using useLayoutEffect ensures the content is set before the browser paints
	// (avoiding a flash of empty content on first mount), while the comparison
	// prevents resetting innerHTML – and thus the cursor – when the user is typing.
	useLayoutEffect(function() {
		if (!domRef.current) return;
		if ((html || '') !== domRef.current.innerHTML) {
			domRef.current.innerHTML = html || '';
			lastHtml.current = html || '';
		}
	});

	var emitChange = function() {
		if (!domRef.current) return;
		var currentHtml = domRef.current.innerHTML;
		if (onChange && currentHtml !== lastHtml.current) {
			onChange({ target: { value: currentHtml } });
		}
		lastHtml.current = currentHtml;
	};

	var stripPaste = function(e) {
		var items = Array.from(e.clipboardData.items);
		var textItem = items.find(function(i) { return i.type === 'text/plain'; });
		if (textItem) {
			var tempDiv = document.createElement('div');
			textItem.getAsString(function(value) {
				tempDiv.innerHTML = value;
				document.execCommand('inserttext', false, tempDiv.innerText);
			});
		}
		e.preventDefault();
	};

	return (
		<div
			ref={setRef}
			onInput={emitChange}
			onBlur={function(e) { emitChange(); if (onBlur) onBlur(e); }}
			onKeyDown={onKeyDown}
			onClick={onClick}
			className={className}
			onFocus={onFocus}
			onPaste={stripPaste}
			data-suggest={suggest}
			contentEditable
			suppressContentEditableWarning
		/>
	);
});

// Line component – renders a single script line and exposes a focus() method
var Line = forwardRef(function Line(props, ref) {
	var line = props.line;
	var index = props.index;
	var previous = props.previous;
	var prevPrevious = props.prevPrevious;
	var onFocusProp = props.onFocus;
	var getSuggestion = props.getSuggestion;
	var readonly = props.readonly;
	var onKeyDown = props.onKeyDown;
	var scriptId = props.scriptId;
	var highlight = props.highlight;

	var focused = useState(false);
	var setFocused = focused[1];
	focused = focused[0];

	var commentingState = useState(false);
	var setCommenting = commentingState[1];
	var commenting = commentingState[0];

	var textRef = useRef(null);
	var commentBoxRef = useRef(null);
	var firebaseLineRef = useRef(dbRef(db, scriptId + '/lines/' + index));

	useImperativeHandle(ref, function() {
		return {
			focus: function(atEnd) {
				if (textRef.current) {
					if (atEnd) placeCaretAtEnd(textRef.current);
					else textRef.current.focus();
				}
			}
		};
	});

	var handleChange = function(event) {
		update(firebaseLineRef.current, { text: event.target.value });
	};

	var handleComment = function(event) {
		update(firebaseLineRef.current, { comment: event.target.value });
	};

	var nextTypeAction = function() {
		var idx = types.indexOf(line.type) + 1;
		update(firebaseLineRef.current, { type: idx < types.length ? types[idx] : types[0] });
	};

	var prevTypeAction = function() {
		var idx = types.indexOf(line.type) - 1;
		update(firebaseLineRef.current, { type: idx >= 0 ? types[idx] : types[types.length - 1] });
	};

	var handleKey = function(event) {
		switch (event.keyCode) {
			case 39: { // right – autocomplete
				if (~['character', 'scene'].indexOf(line.type) && cursorPos(event.target) >= event.target.textContent.length) {
					var suggestion = getSuggestion(index);
					if (suggestion) {
						update(firebaseLineRef.current, { text: line.text + suggestion }).then(function() {
							if (textRef.current) placeCaretAtEnd(textRef.current);
						});
					}
				}
				break;
			}
			case 13: // enter
				event.preventDefault();
				if (line.text) break;
				// fall through to tab
				/* falls through */
			case 9: // tab
				event.preventDefault();
				if (event.shiftKey) prevTypeAction();
				else nextTypeAction();
		}
		onKeyDown(event, line, index, previous, prevPrevious);
	};

	var handleCommentToggle = function(event) {
		event.stopPropagation();
		setCommenting(function(c) {
			var next = !c;
			if (next) {
				setTimeout(function() {
					var listener = function() {
						setCommenting(false);
						document.removeEventListener('click', listener);
					};
					document.addEventListener('click', listener);
					if (commentBoxRef.current) commentBoxRef.current.focus();
				}, 0);
			}
			return next;
		});
	};

	var classes = [
		'line',
		line.type,
		line.comment ? 'commented' : null,
		highlight && line.text && highlight.toUpperCase() === line.text.toUpperCase() ? 'highlight' : null
	].filter(Boolean).join(' ');

	var lineElement;
	var suggest;
	if (readonly) {
		lineElement = <div className="line-text" dangerouslySetInnerHTML={{ __html: line.text }} />;
	} else {
		if (focused) suggest = getSuggestion(index);
		lineElement = (
			<ContentEditable
				ref={textRef}
				html={line.text}
				onChange={handleChange}
				onKeyDown={handleKey}
				onFocus={function() { setFocused(true); onFocusProp(); }}
				onBlur={function() { setFocused(false); }}
				suggest={suggest}
				className="line-text"
			/>
		);
	}

	return (
		<li className={classes}>
			{lineElement}
			<a onClick={handleCommentToggle} className="comment-add">
				<i className="glyphicon glyphicon-comment" />
			</a>
			{commenting && (
				<ContentEditable
					ref={commentBoxRef}
					onChange={handleComment}
					onClick={function(e) { e.stopPropagation(); }}
					className="comment-box"
					html={line.comment}
				/>
			)}
		</li>
	);
});

// Nav component – top navigation bar
function Nav(props) {
	var script = props.script;
	var editingIndex = props.editingIndex;
	var readonly = props.readonly;
	var scriptId = props.scriptId;
	var highlight = props.highlight;
	var onHighlightChange = props.onHighlightChange;

	var openState = useState(null);
	var setOpen = openState[1];
	var open = openState[0];

	var toggle = function(dropdown) {
		if (open !== dropdown) {
			setTimeout(function() {
				var listener = function() {
					setOpen(null);
					document.removeEventListener('click', listener);
				};
				document.addEventListener('click', listener);
			}, 0);
			setOpen(dropdown);
		}
	};

	var setType = function(type) {
		if (!editingIndex) return;
		set(dbRef(db, scriptId + '/lines/' + editingIndex + '/type'), type);
	};

	var handleFieldChange = function(field, event) {
		set(dbRef(db, scriptId + '/' + field), event.target.value);
	};

	var newScript = function() {
		var newRef = push(dbRef(db));
		window.location.hash = '#/' + newRef.key;
		window.location.reload();
	};

	if (!script) return <div />;

	if (script.title) document.title = 'Screenwriter: ' + script.title;

	var editing = (script.lines && script.lines[editingIndex]) || {};

	var characters = [];
	if (open === 'print' && script.lines) {
		var seen = {};
		Object.values(script.lines).forEach(function(l) {
			if (l && l.type === 'character' && l.text) {
				var upper = l.text.toUpperCase();
				if (!seen[upper]) {
					seen[upper] = true;
					characters.push(<option key={upper}>{upper}</option>);
				}
			}
		});
	}

	return (
		<div>
			<div className="navbar navbar-inverse navbar-fixed-top hidden-print" role="navigation">
				<div className="container">
					<ul className="nav navbar-nav btn-block row">
						<li className="col-sm-6 col-xs-12 navbar-btn dropdown">
							<div className="input-group">
								<input
									type="text"
									className="form-control text-center"
									value={script.title || ''}
									onChange={function(e) { handleFieldChange('title', e); }}
									placeholder="Script Title"
									readOnly={readonly}
								/>
								<span className="input-group-btn">
									<a
										className={'btn btn-default slidetip ' + (open === 'print' ? 'active' : '')}
										onClick={function() { toggle('print'); }}
										title="Print Options"
									>
										<i className="glyphicon glyphicon-print" />
									</a>
									<a className="btn btn-default slidetip" onClick={newScript} title="New Script">
										<i className="glyphicon glyphicon-plus" />
									</a>
									<a
										className="btn btn-default slidetip"
										href="https://github.com/ProLoser/screenwriter/issues"
										target="_blank"
										rel="noopener noreferrer"
										title="Report Issues"
									>
										<img
											src="github-icons/GitHub-Mark-32px.png"
											alt="Report Issues on GitHub"
											style={{ width: '16px', height: '16px', verticalAlign: 'middle' }}
										/>
									</a>
								</span>
							</div>
							{open === 'print' && (
								<div
									className="popover bottom"
									style={{ display: 'block' }}
									onClick={function(e) { e.stopPropagation(); }}
								>
									<div className="arrow" />
									<h3
										className="popover-title btn btn-block"
										onClick={function() { window.print(); }}
									>
										Print Script
									</h3>
									<div className="popover-content">
										<div className="form-group">
											<textarea
												placeholder="Author(s)"
												value={script.authors || ''}
												onChange={function(e) { handleFieldChange('authors', e); }}
												className="form-control"
												readOnly={readonly}
											/>
										</div>
										<div className="form-group">
											<textarea
												placeholder="Address (left side)"
												value={script.leftAddress || ''}
												onChange={function(e) { handleFieldChange('leftAddress', e); }}
												className="form-control"
												readOnly={readonly}
											/>
										</div>
										<div className="form-group">
											<textarea
												placeholder="Address (right side)"
												value={script.rightAddress || ''}
												onChange={function(e) { handleFieldChange('rightAddress', e); }}
												className="form-control"
												readOnly={readonly}
											/>
										</div>
										<div className="form-group">
											<select
												className="form-control"
												onChange={function(e) { if (onHighlightChange) onHighlightChange(e.target.value); }}
												title="Highlights a character when printing"
												value={highlight}
											>
												<option value="">-- Highlighter --</option>
												{characters}
											</select>
										</div>
									</div>
								</div>
							)}
						</li>
						{!readonly && (
							<li className={'col-sm-6 col-xs-12 dropdown ' + (open === 'line' ? 'open' : '')}>
								<a onClick={function() { toggle('line'); }}>
									<i className="glyphicon glyphicon-align-center" />
									<span className="uppercase"> {editing.type || 'Line Type'} </span>
									<b className="caret" />
								</a>
								{open === 'line' && (
									<div className="popover bottom" style={{ display: 'block' }}>
										<div className="arrow" />
										<div className="list-group uppercase popover-content text-center">
											{types.map(function(type) {
												return (
													<a
														key={type}
														onClick={function() { setType(type); }}
														className={'list-group-item ' + (editing.type === type ? 'active' : '')}
													>
														{type}
													</a>
												);
											})}
										</div>
									</div>
								)}
							</li>
						)}
					</ul>
				</div>
			</div>
			<header className="visible-print">
				<p className="uppercase">{script.title}</p>
				{script.authors && <p>by</p>}
				<p>{script.authors}</p>
				{highlight && <p className="character-highlighted">Character: {highlight.toUpperCase()}</p>}
				<address className="text-left">{script.leftAddress}</address>
				<address className="text-right">{script.rightAddress}</address>
			</header>
		</div>
	);
}

// ScriptPage component – loads a script from Firebase and renders its lines
function ScriptPage() {
	var params = useParams();
	var scriptId = params.scriptId;
	var action = params.action;

	var scriptState = useState(null);
	var setScript = scriptState[1];
	var script = scriptState[0];

	var editingState = useState(null);
	var setEditingIndex = editingState[1];
	var editingIndex = editingState[0];

	var highlightState = useState('');
	var setHighlight = highlightState[1];
	var highlight = highlightState[0];

	var lineRefs = useRef({});

	useEffect(function() {
		if (!scriptId) return;
		var scriptRef = dbRef(db, scriptId);
		var unsubscribe = onValue(scriptRef, function(snapshot) {
			var val = snapshot.val();
			if (!val) {
				// Initialise an empty script with one blank scene line
				var linesRef = dbRef(db, scriptId + '/lines');
				var newLineRef = push(linesRef, { type: 'scene' });
				set(dbRef(db, scriptId + '/firstLine'), newLineRef.key);
			} else {
				setScript(val);
			}
		});
		return unsubscribe;
	}, [scriptId]);

	useEffect(function() {
		if (script && script.title) {
			document.title = 'Screenwriter: ' + script.title;
		}
	}, [script]);

	var getSuggestion = useCallback(function(lineIndex, fromValue) {
		if (!script || !script.lines || !script.lines[lineIndex]) return '';
		if (!script.lines[lineIndex].text) return '';
		var type = script.lines[lineIndex].type;
		var text = (fromValue && fromValue.toUpperCase()) || script.lines[lineIndex].text.toUpperCase();
		var suggestions = [];
		var passed = false;
		var iterate = function(index) {
			var line = script.lines[index];
			if (!line) return;
			if (line.type === type && line.text && line.text.length > text.length && line.text.toUpperCase().indexOf(text) === 0) {
				suggestions.push(line.text.toUpperCase());
			}
			if (index === lineIndex) passed = true;
			if (passed && suggestions.length) return;
			if (line.next && script.lines[line.next]) iterate(line.next);
		};
		if (script.firstLine) iterate(script.firstLine);
		return (suggestions.pop() || '').substr(text.length);
	}, [script]);

	var focusLine = function(index, atEnd) {
		var r = lineRefs.current[index];
		if (r && r.current) r.current.focus(atEnd || false);
	};

	var handleKey = useCallback(function(event, line, index, prevIndex, prevPrevIndex) {
		switch (event.keyCode) {
			case 38: // up
				if (prevIndex) {
					if (event.metaKey || event.ctrlKey) {
						// [a, b, C, d] => [a, C, b, d]
						if (prevPrevIndex) update(dbRef(db, scriptId + '/lines/' + prevPrevIndex), { next: index });
						else update(dbRef(db, scriptId), { firstLine: index });
						var nextIndexBeforeSwap = line.next;
						update(dbRef(db, scriptId + '/lines/' + index), { next: prevIndex });
						if (line.next) update(dbRef(db, scriptId + '/lines/' + prevIndex), { next: nextIndexBeforeSwap });
						else remove(dbRef(db, scriptId + '/lines/' + prevIndex + '/next'));
						setTimeout(function() { focusLine(index, true); }, 0);
						event.preventDefault();
					} else if (!cursorPos(event.target)) {
						focusLine(prevIndex, true);
						event.preventDefault();
					}
				}
				break;
			case 40: // down
				if (line.next) {
					if (event.metaKey || event.ctrlKey) {
						// [a, b, c, d] => [a, c, b, d]
						if (prevIndex) update(dbRef(db, scriptId + '/lines/' + prevIndex), { next: line.next });
						else update(dbRef(db, scriptId), { firstLine: line.next });
						var nextLineData = script && script.lines && script.lines[line.next];
						var nextIndexAfterCurrent = nextLineData && nextLineData.next;
						update(dbRef(db, scriptId + '/lines/' + line.next), { next: index });
						if (nextIndexAfterCurrent) update(dbRef(db, scriptId + '/lines/' + index), { next: nextIndexAfterCurrent });
						else remove(dbRef(db, scriptId + '/lines/' + index + '/next'));
						setTimeout(function() { focusLine(index, false); }, 0);
						event.preventDefault();
					} else if (cursorPos(event.target) >= event.target.textContent.length) {
						focusLine(line.next, false);
						event.preventDefault();
					}
				}
				break;
			case 8: // backspace
				if (!line.text && prevIndex) {
					if (line.next) update(dbRef(db, scriptId + '/lines/' + prevIndex), { next: line.next });
					else remove(dbRef(db, scriptId + '/lines/' + prevIndex + '/next'));
					remove(dbRef(db, scriptId + '/lines/' + index));
					setTimeout(function() { focusLine(prevIndex, true); }, 0);
					event.preventDefault();
				}
				break;
			case 13: // enter
				if (line.text) {
					var newItem = { type: nextTypes[line.type] };
					if (line.next) newItem.next = line.next;
					var newLineRef = push(dbRef(db, scriptId + '/lines'), newItem);
					set(dbRef(db, scriptId + '/lines/' + index + '/next'), newLineRef.key);
					setTimeout(function() { focusLine(newLineRef.key, false); }, 0);
				}
				break;
		}
	}, [scriptId, script]);

	// Build the ordered array of line elements from the linked list
	var lineElements = [];
	var previous = null;
	var prevPrevious = null;

	var iterateLines = function(line, index) {
		if (!line) return;
		if (!lineRefs.current[index]) lineRefs.current[index] = { current: null };
		var lineRef = lineRefs.current[index];

		lineElements.push(
			<Line
				key={index}
				ref={lineRef}
				line={line}
				index={index}
				previous={previous}
				prevPrevious={prevPrevious}
				onFocus={function() { setEditingIndex(index); }}
				getSuggestion={getSuggestion}
				readonly={action === 'view'}
				onKeyDown={handleKey}
				scriptId={scriptId}
				highlight={highlight}
			/>
		);
		prevPrevious = previous;
		previous = index;
		if (line.next && script.lines[line.next]) iterateLines(script.lines[line.next], line.next);
	};

	if (script && script.lines && script.firstLine) {
		iterateLines(script.lines[script.firstLine], script.firstLine);
	}

	return (
		<div>
			<Nav
				script={script || {}}
				editingIndex={editingIndex}
				readonly={action === 'view'}
				scriptId={scriptId}
				highlight={highlight}
				onHighlightChange={setHighlight}
			/>
			<ul className="script">
				{script
					? (lineElements.length > 0 ? lineElements : null)
					: <li><h1 className="text-center">Loading Script...</h1></li>}
			</ul>
		</div>
	);
}

// Home component – landing page
function Home() {
	var commentStyles = {
		color: '#dd0',
		textShadow: '0 1px 1px #000',
		fontSize: '120%'
	};

	var newScript = function() {
		var newRef = push(dbRef(db));
		window.location.hash = '#/' + newRef.key;
		window.location.reload();
	};

	return (
		<div>
			<div className="text-center">
				<h1>Screenwriter</h1>
				<p>
					<a className="btn btn-primary" onClick={newScript}>
						<i className="glyphicon glyphicon-plus" /> New Script
					</a>
					&nbsp;
					<Link className="btn btn-primary" to="/demo">Demo Script</Link>
				</p>
				<p>
					<a className="btn btn-default" href="https://github.com/ProLoser/screenwriter">
						<img src="github-icons/GitHub-Mark-32px.png" alt="Github" /> Source Code
					</a>
				</p>
			</div>

			<h3>Collaborate:</h3>
			<p>Share your custom URL with friends to collaborate or add <code>/view</code> to the end for <strong>readonly</strong> mode!</p>

			<h3>Shortcuts:</h3>
			<p>
				<strong>Enter</strong> Insert new line<br />
				<strong>(Shift+)Tab</strong> Cycle through line types<br />
				<strong>Up/Down</strong> Move through lines<br />
				<strong>Cmd/Ctrl+Up/Down</strong> Reorder lines<br />
				<strong>Right</strong> Autocomplete the character or scene<br />
			</p>

			<h3>Comments:</h3>
			<p className="help">Hover over a line and click comment button <i className="glyphicon glyphicon-comment" style={commentStyles} /></p>

			<h3>Notes:</h3>
			<p>Scripts are not secure, if someone can figure out your URL, they can edit it. Print to PDF if you want a permanent copy.</p>
		</div>
	);
}

// Root App component with hash-based routing
function App() {
	return (
		<HashRouter>
			<Routes>
				<Route path="/" element={<Home />} />
				<Route path="/:scriptId" element={<ScriptPage />} />
				<Route path="/:scriptId/:action" element={<ScriptPage />} />
			</Routes>
		</HashRouter>
	);
}

// Mount the React app
var root = createRoot(document.getElementById('container'));
root.render(<App />);