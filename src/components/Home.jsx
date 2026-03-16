import { Link } from 'react-router';
import { ref as dbRef, push } from 'firebase/database';
import { db } from '../firebase.js';

// Home component – landing page shown at '#/'.
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

export default Home;
