import { useState } from 'react';
import { ref as dbRef, set, push } from 'firebase/database';
import { db } from '../firebase.js';
import { types } from '../constants.js';

// Nav component – top navigation bar with title, print options and line-type picker.
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

export default Nav;
