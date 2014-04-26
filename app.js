app = angular.module('scrnplay', ['ui.router', 'firebase']);
app.config(function($stateProvider, $urlRouterProvider){
    $urlRouterProvider.otherwise('/');
    $stateProvider.state('home', {
        url: '/',
        templateUrl: 'home.html',
        controller: function($scope) {
            function S4() {
               return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
            }
            function guid() {
               return (S4()+S4()+"-"+S4()+"-"+S4()+"-"+S4()+"-"+S4()+S4()+S4());
            }
            $scope.id = guid();
        }
    })
    $stateProvider.state('script', {
        url: '/:scriptId',
        templateUrl: 'script.html',
        controller: function($scope, $firebase, $stateParams, $timeout){
            var script = new Firebase("https://screenwrite.firebaseio.com/"+$stateParams.scriptId);
            fbScript = $firebase(script);
            fbScript.$bind($scope, 'script', function(){
                $scope.$apply(function(){
                    if (!$scope.script)
                        $scope.script = {};
                    if (!$scope.script.lines)
                        $scope.script.lines = [{type:'scene'}];
                });
            });
          
            var types = $scope.types = ['scene', 'action', 'character', 'dialogue', 'parenthetical', 'transition', 'shot', 'text'];
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
            $scope.comment = function(line){
                if ($scope.commenting === line) {
                    $scope.commenting = null;
                } else {
                    $scope.commenting = line;
                    $scope.$broadcast('comment', line);
                }
            };
            $scope.edit = function(line){
                $scope.editing = line;
            };
            $scope.keypress = function($event, line){
                switch ($event.keyCode) {
                    case 13: // enter
                        $event.preventDefault();
                        if (line.text) {
                            $scope.newLine(line);
                        }
                }
            };
            
            $scope.focus = function(line) {
                $scope.$broadcast('focus', line);
            }
            $scope.clean = function(text) {
                return text.replace(/[^0-9a-zA-Z]/, '+');
            };
            $scope.suggestions = function(line) {
                var suggestions = [];
                $scope.script.lines.forEach(function(suggestion){
                    if ( suggestion.text !== line.text && line.type === suggestion.type && ~suggestion.text.toUpperCase().indexOf(line.text.toUpperCase()) && !~suggestions.indexOf(suggestion.text) )
                        suggestions.push(suggestion.text);
                });
                return suggestions;
            };
            $scope.keydown = function($event, line){
                switch ($event.keyCode) {
                    case 38: // up
                        if ($event.shiftKey) {
                            var lines = $scope.script.lines;
                            var index = lines.indexOf(line);
                            if (index > 0) {
                                lines.splice(index, 1);
                                lines.splice(index - 1, 0, line);
                                $timeout(function(){
                                    $scope.focus(line); 
                                });
                            }
                        } else {
                            $scope.focus($scope.script.lines[$scope.script.lines.indexOf(line) - 1]);
                            $event.preventDefault();
                        }
                        break;
                    case 40: // down
                        if ($event.shiftKey) {
                            var lines = $scope.script.lines;
                            var index = lines.indexOf(line);
                            lines.splice(index, 1);
                            lines.splice(index + 1, 0, line);
                            $timeout(function(){
                                $scope.focus(line); 
                            });
                        } else {
                            $scope.focus($scope.script.lines[$scope.script.lines.indexOf(line)+1]);
                            $event.preventDefault();
                        }
                        break;
                    case 8: // backspace
                        if (!line.text && $scope.script.lines.length > 1) {
                            $scope.focus($scope.script.lines[$scope.script.lines.indexOf(line)-1]);
                            $scope.script.lines.splice($scope.script.lines.indexOf(line), 1);
                            $event.preventDefault();
                        }
                        break;
                    case 13: // enter
                        if (line.text) {
                            break;
                        } else {
                            $event.preventDefault();
                        }
                    case 9: // tab
                        $event.preventDefault();
                        if ($event.shiftKey) {
                            $scope.prev(line);
                        } else {
                            $scope.next(line);
                        }

                }
            };
            $scope.newLine = function(line) {
                var newLine = {
                    type: nextTypes[line.type]
                };
                $scope.script.lines.splice($scope.script.lines.indexOf(line) + 1, 0, newLine);
                $scope.edit(newLine);
            };
            $scope.next = function(line) {
                var type = types.indexOf(line.type) + 1;
                type = (type < types.length) ? type : 0;
                line.type = types[type];
            };
            $scope.prev = function(line) {
                var type = types.indexOf(line.type) - 1;
                type = (type >= 0) ? type : types.length - 1;
                line.type = types[type];
            };
            $scope.words = function(){
                var words = 0;
                $scope.script.lines.forEach(function(line){
                    words += line.text.split(' ');
                });
                return words;
            }
            
        }
    });
});
app.directive('textarea', function($timeout){
    return {
        restrict: 'E',
        link: function($scope, $element, $attrs) {
            $element[0].focus();
            $element[0].style.height = $element[0].scrollHeight + 'px';
            $element.on('input', function(){
                $element[0].style.height = $element[0].scrollHeight + 'px';
            });
            if ($element.hasClass('line')) {
                $scope.$on('focus', function(event, line){
                   if (line === $scope.line)
                        setTimeout(function(){
                            $element[0].focus(); 
                        });
                });
            }
            if ($element.hasClass('comment')) {
                $scope.$on('comment', function(event, line){
                   if (line === $scope.line)
                        $timeout(function(){
                            $element[0].focus();  
                        });
                });
            }
        }
    };
});
app.filter('unique', function(){
    return function(data){
        return _.uniq(data, false, function(row){
            return row && row.text && row.text.toUpperCase();
        });
    };
});
