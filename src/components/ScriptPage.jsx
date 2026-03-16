import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router';
import { ref as dbRef, onValue, set, push, update, remove } from 'firebase/database';
import { db } from '../firebase.js';
import { nextTypes } from '../constants.js';
import { cursorPos } from '../utils.js';
import Nav from './Nav.jsx';
import Line from './Line.jsx';

// ScriptPage component – loads a script from Firebase and renders its lines.
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
				// Initialize an empty script with one blank scene line
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
						// [a, b, C, d] => [a, C, b, d]: A→C, C→B, B→D
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
						// [a, b, c, d] => [a, c, b, d]: A→C, C→B, B→D
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

	// Walk the linked list to build the ordered array of line elements
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

export default ScriptPage;
