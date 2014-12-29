app = angular.module('scrnplay', ['ui.router', 'firebase', 'ngStorage', 'contenteditable', 'MassAutoComplete']);
app.config(function($stateProvider, $urlRouterProvider){
    $urlRouterProvider.otherwise('/');
    $stateProvider.state('home', {
        url: '/',
        templateUrl: 'home'
    });
    $stateProvider.state('script', {
        url: '/{scriptId:.+}',
        views: {
            'nav': {
                templateUrl: 'nav.html',
                controller: 'Script',
            },
            '': {
                templateUrl: 'script.html',
                controller: 'Script',
            }
        },
        resolve: {
            script: function($stateParams){
                return new Firebase("https://screenwrite.firebaseio.com/"+$stateParams.scriptId);
            }
        }
    });
});
app.run(function($rootScope, $state, types, $timeout, $window){
    $rootScope.edit = function(line){
        $rootScope.editing = line;
    };
    $rootScope.focus = function(line){
        $timeout(function(){
            $rootScope.$broadcast('focus', line);
        });
    };

    $rootScope.dropdowns = '';
    $rootScope.printer = {};

    $rootScope.print = function(){
        $window.print();
    };

    $rootScope.toggle = function(dropdown) {
        if ($rootScope.dropdowns === dropdown)
            $rootScope.dropdowns = '';
        else
            $rootScope.dropdowns = dropdown;
    };

    function S4() {
       return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
    }
    function guid() {
       return (S4()+S4()+"-"+S4()+"-"+S4()+"-"+S4()+"-"+S4()+S4()+S4());
    }
    $rootScope.new = function(){
        $state.go('script', { scriptId: guid() });
    };

});
app.constant('types', ['scene', 'action', 'character', 'dialogue', 'parenthetical', 'transition', 'shot', 'text']);
app.controller('Script', function($scope, types, script, $localStorage, $stateParams, $firebase){
    $firebase(script).$bind($scope, 'script').then(function(unbind){
        if (!$scope.script)
            $scope.script = {};
        if (!$scope.script.lines)
            $scope.script.lines = [{type:'scene' }];
        $localStorage[$stateParams.scriptId] = $scope.script;
        return unbind;
    });
    $scope.types = types;
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
    $scope.closeComment = function() {
        if (!$scope.commenting && !$scope.commenting.comment) {
            $scope.commenting = null;
        }
    };
    $scope.keypress = function($event, line){
        switch ($event.keyCode) {
            case 13: // enter
                $event.preventDefault();
                if ($event.shiftKey) {
                    var suggestions = $scope.suggestions(line);
                    if (suggestions[0])
                        line.text = suggestions[0];
                } else if (line.text) {
                    $scope.newLine(line);
                }
        }
    };
    $scope.clean = function(text) {
        return text.replace(/[^0-9a-zA-Z]/, '+');
    };
    $scope.$watchCollection('script.lines', function(lines){
        $scope.$root.characters = [];
        if (!lines) return;
        var length = lines.length;
        // iterate in reverse so most recently used items show up first
        while (length--) {
            line = lines[length];
            if (line.type !== 'character') continue;
            if ($scope.characters.some(function(previous){return previous.toUpperCase() === line.text.toUpperCase()})) continue;
            $scope.characters.push(line.text.toUpperCase());
        }
    });
    $scope.suggestions = function(line) {
        if (line.type !== 'character' && line.type !== 'scene') return;
        var suggestions = [], suggestion;
        var length = $scope.script.lines.length;
        // iterate in reverse so most recently used items show up first
        while (length--) {
            suggestion = $scope.script.lines[length];
            if (line === suggestion) continue;
            if (!line.text || !suggestion.text) continue;
            if (line.text.toUpperCase() === suggestion.text.toUpperCase()) continue;
            if (suggestion.type !== line.type) continue;
            if (!~suggestion.text.toUpperCase().indexOf(line.text.toUpperCase())) continue;
            if (suggestions.some(function(previous){return previous.toUpperCase() === suggestion.text.toUpperCase()})) continue;
            suggestions.push(suggestion.text);
        }
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
                        $scope.focus(line); 
                    }
                } else {
                    $scope.focus($scope.script.lines[$scope.script.lines.indexOf(line) - 1]);
                }
                $event.preventDefault();
                break;
            case 40: // down
                if ($event.shiftKey) {
                    var lines = $scope.script.lines;
                    var index = lines.indexOf(line);
                    lines.splice(index, 1);
                    lines.splice(index + 1, 0, line);
                    $scope.focus(line);
                } else {
                    $scope.focus($scope.script.lines[$scope.script.lines.indexOf(line)+1]);
                }
                $event.preventDefault();
                break;
            case 8: // backspace
                if ((!line.text || $event.ctrlKey) && $scope.script.lines.length > 1) {
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
        var newLine;
        var nextLine = $scope.script.lines[$scope.script.lines.indexOf(line) + 1];
        if (nextLine && !nextLine.text) {
            newLine = nextLine;
        } else {
            newLine = {};
            $scope.script.lines.splice($scope.script.lines.indexOf(line) + 1, 0, newLine);
        }
        newLine.type = nextTypes[line.type];
        $scope.focus(newLine);
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
    
});
app.directive('contenteditable', function($timeout){
    return {
        restrict: 'A',
        link: function($scope, $element, $attrs) {
            // Focus element on scope event
            var focusBinding = $scope.$on('focus', function(event, line){
               if (line === $scope.line)
                    $element[0].focus(); 
            });
            // Strip formatting on paste
            var pasteBinding = $element.on('paste', function (e) {
                var tempDiv = document.createElement("DIV");
                Array.prototype.forEach.call(e.clipboardData.items, function (item) {
                    item.getAsString(function (value) {
                        tempDiv.innerHTML = value;
                        document.execCommand('inserttext', false, tempDiv.innerText);
                    })
                })
                e.preventDefault();
            });
            $scope.$on('$destroy', function(){
                focusBinding();
            });
        }
    };
});

app.directive('commentBox', function($timeout){
    return {
        restrict: 'C',
        link: function($scope, $element, $attrs) {
            $scope.$on('comment', function(event, line){
               if (line === $scope.line)
                    $timeout(function(){
                        $element[0].focus();
                    });
            });
        }
    };
});

app.directive('ngAutofocus', function(){
    return function($scope, $element, $attrs) {
        if ($scope.$eval($attrs.ngAutofocus))
            $element[0].focus();
    };
});
app.filter('unique', function(){
    return function(data){
        return _.uniq(data, false, function(row){
            return row && row.text && row.text.toUpperCase();
        });
    };
});
