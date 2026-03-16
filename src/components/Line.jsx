import { forwardRef, useRef, useState, useImperativeHandle } from 'react';
import { ref as dbRef, update } from 'firebase/database';
import { db } from '../firebase.js';
import { types } from '../constants.js';
import { cursorPos, placeCaretAtEnd } from '../utils.js';
import ContentEditable from './ContentEditable.jsx';

// Line component – renders a single screenplay line and exposes a focus() method.
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

	var suggest;
	var lineElement;
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

export default Line;
