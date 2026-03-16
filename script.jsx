// CSS entry – bundled by esbuild so Bootstrap and app styles are self-hosted
import 'bootstrap/dist/css/bootstrap.min.css';
import './styles.scss';
import './print.scss';

import { createRoot } from 'react-dom/client';
import App from './src/App.jsx';

var root = createRoot(document.getElementById('container'));
root.render(<App />);
