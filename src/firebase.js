import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

var firebaseApp = initializeApp({ databaseURL: 'https://screenwrite.firebaseio.com' });
export var db = getDatabase(firebaseApp);
