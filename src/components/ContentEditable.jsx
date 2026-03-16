import { forwardRef, useRef, useLayoutEffect } from 'react';

// ContentEditable – keeps cursor stable while the user types.
// The html prop is written to the DOM only when it genuinely differs from the
// current DOM content, preventing React from resetting the cursor position.
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

export default ContentEditable;
