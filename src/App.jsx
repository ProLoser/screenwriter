import { HashRouter, Routes, Route } from 'react-router';
import Home from './components/Home.jsx';
import ScriptPage from './components/ScriptPage.jsx';

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

export default App;
