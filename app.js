app = angular.module('scrnplay', []);
app.run(function($rootScope) {

    $rootScope.lines = [{type:'scene'}];
    var types = $rootScope.types = ['scene', 'action', 'character', 'dialogue', 'parenthetical', 'transition', 'shot', 'text'];
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
    $rootScope.keypress = function($event, line){
        switch ($event.keyCode) {
            case 13: // enter
                $rootScope.newLine(line);
                $event.preventDefault();
        }
    };
    $rootScope.keydown = function($event, line){
        switch ($event.keyCode) {
            case 9: // tab
                $event.preventDefault();
                if ($event.shiftKey) {
                    $rootScope.prev(line);
                } else {
                    $rootScope.next(line);
                }

        }
    };
    $rootScope.newLine = function(line) {
        var newLine = {
            type: nextTypes[line.type]
        };
        $rootScope.lines.splice($rootScope.lines.indexOf(line) + 1, 0, newLine);
    };
    $rootScope.next = function(line) {
        console.log('hi');
        var type = types.indexOf(line.type) + 1;
        type = (type < types.length) ? type : 0;
        line.type = types[type];
    };
    $rootScope.prev = function(line) {
        var type = types.indexOf(line.type) - 1;
        type = (type >= 0) ? type : types.length - 1;
        line.type = types[type];
    };
    $rootScope.nextType = function(line) {

    };
});
app.directive('textarea', function(){
    return {
        restrict: 'E',
        link: function($scope, $element, $attrs) {
            $element.on('input', function(){
            });
        }
    };
});
