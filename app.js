angular.module('npaScheduler', [])
.factory('Event', function($http) {
  return {
    post: function(klass, data) {
      var requestConfig = {
        method: 'POST',
        url: 'https://api.parse.com/1/classes/' + klass,
        headers: {
          'X-Parse-Application-Id' : window.parseHeaders["X-Parse-Application-Id"],
          'X-Parse-REST-API-Key' : window.parseHeaders["X-Parse-REST-API-Key"],
          'Content-Type' : 'application/json'
        },
        data: data
      };
      return $http(requestConfig);
    }
  }
})
.directive('dateParse', function() {
  return {
    require: 'ngModel',
    link: function($scope, $element, $attrs, ngModelCtrl) {
      var dateParse = function(date) {
        var dateObject = {
          "__type" : "Date",
          "iso" : date
        };
        return dateObject;
      };
      ngModelCtrl.$parsers.push(dateParse);
    }
  }
})
.controller('timeOffController', function($scope, Event) {
  $scope.message = "Waiting on update...";
  $scope.event = {
    start: "",
    end: "",
    description: ""
  };
  $scope.scheduleTimeOff = function() {
    Event.post('TimeOff', $scope.event)
    .success(function() { $scope.message = "Success!"; })
    .error( function() { $scope.message = "Error!"; });
  };
});

