app = angular.module('scrnplay', ['ui.router', 'firebase']);
app.config(function($stateProvider, $urlRouterProvider){
    $urlRouterProvider.otherwise('/');
    $stateProvider.state('home', {
        url: '/',
        templateUrl: 'home.html'
    })
    $stateProvider.state('script', {
        url: '/:scriptId',
        templateUrl: 'script.html',
        controller: function($scope, $firebase, $stateParams){
             var script = new Firebase("https://screenwrite.firebaseio.com/"+$stateParams.scriptId);
            fbScript = $firebase(script);
            fbScript.$bind($scope, 'script', function(){
                if (!$scope.script.lines)
                    $scope.$apply("script.lines = [{type:'scene'}]");
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
            $scope.keypress = function($event, line){
                switch ($event.keyCode) {
                    case 13: // enter
                        $scope.newLine(line);
                        $event.preventDefault();
                }
            };
            $scope.keydown = function($event, line){
                switch ($event.keyCode) {
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
            };
            $scope.next = function(line) {
                console.log('hi');
                var type = types.indexOf(line.type) + 1;
                type = (type < types.length) ? type : 0;
                line.type = types[type];
            };
            $scope.prev = function(line) {
                var type = types.indexOf(line.type) - 1;
                type = (type >= 0) ? type : types.length - 1;
                line.type = types[type];
            };
            $scope.nextType = function(line) {

            };
        }
    });
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
