export var types = ['scene', 'action', 'character', 'dialogue', 'parenthetical', 'transition', 'shot', 'text'];

export var nextTypes = {
	scene: 'action',
	action: 'action',
	character: 'dialogue',
	dialogue: 'character',
	parenthetical: 'dialogue',
	transition: 'scene',
	shot: 'action',
	text: 'text'
};
