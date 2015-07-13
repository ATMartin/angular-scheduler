angular.module('npaScheduler', ['ngRoute'])
.config(function($routeProvider, $locationProvider) {
  $routeProvider
    .when('/user/new', {
      templateUrl: 'pages/user-new.html',
      controller: 'userController'
    })
    .when('/user/login', {
      templateUrl: 'pages/user-login.html',
      controller: 'userController'
    })
    .when('/user/profile', {
      templateUrl: 'pages/user-profile.html',
      controller: 'userController'
    })
    .when('/admin', {
      templateUrl : 'pages/admin.html',
      controller : 'adminController'
    })
    .otherwise({
      templateUrl: 'pages/schedule.html',
      controller: 'timeOffController'
    });
    //$locationProvider.html5Mode(true);
})
.factory('Event', function($http) {
  return {
    defaultConfig : {
      method: 'GET',
      baseUrl: 'https://api.parse.com/1/classes/',
      headers: {
        'X-Parse-Application-Id' : window.parseHeaders["X-Parse-Application-Id"],
        'X-Parse-REST-API-Key' : window.parseHeaders["X-Parse-REST-API-Key"],
        'Content-Type' : 'application/json'
      }
    },
    getAll: function(klass) {
      var reqConfig = this.defaultConfig;
      reqConfig.url = reqConfig.baseUrl + klass;
      reqConfig.method = 'GET';
      return $http(reqConfig);
    },
    post: function(klass, data) {
      var requestConfig = this.defaultConfig;
      requestConfig.url = requestConfig.baseUrl + klass;
      requestConfig.method = 'POST';
      if (data.objectId) {
        requestConfig.url +=  "/" + data.objectId;
        requestConfig.method = 'PUT';
      };
      requestConfig.data = data;
      return $http(requestConfig);
    },
    delete: function(klass, id) {
      if (confirm("Are you sure you want to delete this " + klass + "?")) {
        var reqConfig = this.defaultConfig;
        reqConfig.url = reqConfig.baseUrl + klass + '/' + id;
        reqConfig.method = 'DELETE';
        return $http(reqConfig);
      }
    },
    getOpenTimeOff: function() {
      var reqConfig = this.defaultConfig;
      querystring = encodeURI('where={"approved":{"$exists":false}}&include=employee');
      reqConfig.url = reqConfig.baseUrl + 'TimeOff?' + querystring;
      reqConfig.method = 'GET';
      console.log(reqConfig.url);
      return $http(reqConfig);
    },
    newUser: function(userdata) {
      userdata.username = userdata.email;
      var rc = this.defaultConfig;
      rc.url = "https://api.parse.com/1/users";
      rc.method = 'POST';
      rc.data = userdata;
      return $http(rc);
    }
  }
})
.service('Session', function($http, $filter) {
  this.loggedIn = false;
  this.new = function(user) {
    this.token = user.sessionToken;
    this.loggedIn = true;
    this.cacheUser(user);
  };
  this.login = function(user) {
    var _this = this;
    $http({
      method: 'GET',
      url: 'https://api.parse.com/1/login?' + encodeURI('username=' + user.username + '&password=' + user.password),
      headers: {
        'X-Parse-Application-Id' : window.parseHeaders["X-Parse-Application-Id"],
        'X-Parse-REST-API-Key' : window.parseHeaders["X-Parse-REST-API-Key"],
        'Content-Type' : 'application/json'
      }
    })
    .success(function(data) {
      _this.new(data);
    })
    .error(function(data) { console.log("ERROR LOGGING IN!"); });
  };
  this.cacheUser = function(user) {
    if (!this.loggedIn) { return false; }
    var _this = this;
    var userObjectQuery = function() {
      return $http({
      method: 'GET',
      url: 'https://api.parse.com/1/users/' + user.objectId + '?' + encodeURI('include=employee'),
      headers: {
        'X-Parse-Application-Id' : window.parseHeaders["X-Parse-Application-Id"],
        'X-Parse-REST-API-Key' : window.parseHeaders["X-Parse-REST-API-Key"],
        'X-Parse-Session-Token': this.token,
        'Content-Type' : 'application/json'
      }
    });
    };
    var userRequestsQuery = function() {
      console.log(_this.user.employee);
      var wrappedEmployee = $filter('pointer')('Employee', _this.user.employee.objectId);
      console.log(wrappedEmployee);
      return $http({
      method: 'GET',
        url: 'https://api.parse.com/1/classes/TimeOff?' + encodeURI('where={"employee":'+JSON.stringify(wrappedEmployee)+'}'),
        headers: {
          'X-Parse-Application-Id' : window.parseHeaders["X-Parse-Application-Id"],
          'X-Parse-REST-API-Key' : window.parseHeaders["X-Parse-REST-API-Key"],
          'Content-Type' : 'application/json'
        }
      });
    };
    userObjectQuery().success(function(user) {
      _this.user = user;
      console.log(_this.user);
      userRequestsQuery().success(function(requests) {
        _this.user.requests = requests.results;
        console.log("Logged in.");
        console.log(_this.user);
      });
    });
  };
  this.currentUser = function() { return this.user; };
  this.destroy = function() {
    this.user = null;
    this.token = null;
    this.loggedIn = false;
  };
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
.filter('pointer', function() {
  return function(klass, id) {
    return {
      "__type": "Pointer",
      "className": klass,
      "objectId": id
    };
  };
})
.controller('adminController', function($scope, Event) {
  $scope.message = "Welcome, Administrator!";
  $scope.getAllUsers = function() {
    Event.getAll('Employee')
    .success(function(data) {
      $scope.users = data.results;
      console.log(data.results);
    });
  };
  $scope.updateUser = function(user) {
    Event.post('Employee', user)
    .success(function() {
      $scope.newuser = {};
      $scope.getAllUsers();
    })
    .error(function() { $scope.message = "FAIL!"; });
  };
  $scope.editUser = function(user) {
    $scope.newuser = user;
    console.log(user);
  };
  $scope.deleteUser = function(user) {
    Event.delete('Employee', user.objectId)
    .success(function() { $scope.getAllUsers(); });
  };
  $scope.getOpenRequests = function() {
    Event.getOpenTimeOff()
    .success(function(data) {
      $scope.openRequests = data.results;
      console.log(data);
    });
  };
  $scope.approveRequest = function(event) {
    approved = {
      objectId: event.objectId,
      approved: true
    };
    Event.post('TimeOff', approved)
    .success(function() { $scope.getOpenRequests(); });
  };
  $scope.denyRequest = function(event) {
    denied = {
      objectId: event.objectId,
      approved: false
    };
    Event.post('TimeOff', denied)
    .success(function() { $scope.getOpenRequests(); });
  };
  $scope.users = [];
  // Init
  $scope.getAllUsers();
  $scope.getOpenRequests();
})
.controller('timeOffController', function($scope, Event) {
  $scope.message = "Waiting on update...";
  $scope.event = {
    start: "",
    end: "",
    description: ""
  };
  $scope.scheduleTimeOff = function() {
    $scope.event.employee = {
      "__type": "Pointer",
      "className": "Employee",
      "objectId": $scope.event.employee
    };
    Event.post('TimeOff', $scope.event)
    .success(function() {
      $scope.message = "Success!";
      $scope.event = {};
    })
    .error( function() { $scope.message = "Error!"; });
  };
  $scope.getAllUsers = function() {
    Event.getAll('Employee')
    .success(function(data) {
      $scope.users = data.results;
      console.log(data.results);
    });
  };
  //Init
  $scope.getAllUsers();
})
.controller('userController', function($scope, $location, $filter, Event, Session) {
  $scope.message1 = "NewUser";
  $scope.message2 = "UserProfile";
  $scope.toggleLogin = function() {
    Session.loggedIn = !Session.loggedIn;
  };
  $scope.loggedIn = function() { return Session.loggedIn; };
  $scope.doLogin = function(user) {
    Session.login(user);
    $location.path('/user/profile');
  };
  $scope.makeNewUser = function() {
    Event.post('Employee', $scope.newemployee)
    .success(function(data) {
      /*
      $scope.newuser.employee = {
        "__type": "Pointer",
        "className": "Employee",
        "objectId": data.objectId
      };
      */
      $scope.newuser.employee = $filter('pointer')('Employee', data.objectId);
      Event.newUser($scope.newuser)
      .success(function(data) {
        Session.login(data);
        console.log("Logged in!");
      });
    })
  };
  $scope.getUser = function() {
    return Session.currentUser();
  };
});
