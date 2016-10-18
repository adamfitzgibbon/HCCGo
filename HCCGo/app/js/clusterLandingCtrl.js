
clusterLandingModule = angular.module('HccGoApp.clusterLandingCtrl', ['ngRoute' ]);

clusterLandingModule.controller('clusterLandingCtrl', ['$scope', '$log', '$timeout', 'connectionService', '$routeParams', '$location', '$q', 'preferencesManager', 'filePathService', function($scope, $log, $timeout, connectionService, $routeParams, $location, $q, preferencesManager, filePathService) {

  $scope.params = $routeParams;
  $scope.jobs = [];
  var clusterInterface = null;
  var path = require('path');
  var jobHistory = path.join(__dirname, 'data/jobHistory.json');

  // Check if app data folder is there, if not, create one with default json file
  var filePath = filePathService.getFilePath();
  var dataPath = filePathService.getDataPath();
  var dbPath = filePathService.getDBPath();

  var fs = require('fs');
  fs.exists(dataPath, function(exists) {
    if(!exists) {
        fs.mkdir(dataPath, function() {
            // create default files
            fs.createReadStream(jobHistory).pipe(fs.createWriteStream(filePath));
            fs.createWriteStream(dbPath);
        });
    }
    else {
      fs.exists(filePath, function(fileExists) {
        if(!fileExists)
          fs.createReadStream(jobHistory).pipe(fs.createWriteStream(filePath));
      });
      fs.exists(dbPath, function(fileExists) {
        if(!fileExists)
          fs.createWriteStream(dbPath);
      });
    }
  });

  // nedb datastore
  const Datastore = require('nedb');
  var db = new Datastore({ filename: dbPath, autoload: true });

  // Generate empty graphs
  var homeUsageGauge = c3.generate({
    bindto: '#homeUsageGauge',
    data: {
      columns: [
        ['Loading', 0]
      ],
      type: 'gauge'
    },
    gauge: {
      units: 'Loading',
      label: {
        format: function(value, ratio) {
            return value.toFixed(2);
        }
      },
      max: 0,

    },
    color: {
      pattern: [ '#60B044', '#F6C600', '#F97600', '#FF0000' ],
      threshold: {
        values: [30, 60, 90, 100]
      }
    },
    size: {
      height: 180
    }

  });

  var workUsageGauge = c3.generate({
    bindto: '#workUsageGauge',
    data: {
      columns: [
        ['Loading', 0]
      ],
      type: 'gauge'
    },
    gauge: {
      units: 'Loading',
      label: {
        format: function(value, ratio) {
            return value.toFixed(2);
        }
      },
      max: 0,

    },
    color: {
      pattern: [ '#60B044', '#F6C600', '#F97600', '#FF0000' ],
      threshold: {
        values: [30, 60, 90, 100]
      }
    },
    size: {
      height: 180
    }

  });


  $scope.refreshCluster = function() {
    getClusterStats($scope.params.clusterId);

  }

  $scope.removeCompletedJob = function(index) {
    // deletes the document from db and removes it from list
    var job = $scope.jobs[index];
    $scope.jobs.splice(index,1);
    db.remove({ _id: job._id }, { multi: true }, function (err, numRemoved) {
      if(err) console.log("Error deleting document " + err);
    });
  }

  function getClusterStats(clusterId) {

    // Begin spinning the refresh image
    $(".mdi-action-autorenew").addClass("spinning-image");

    // Array to concat together running and completed jobs
    var jobList = [];

    // Get completed jobs from db file
    db.find({ loaded: true }, function (err, docs) {
      // if data already loaded, just add them to the list
      jobList = jobList.concat(docs);
      if(err) console.log("Error fetching completed jobs: " + err);
    });

    db.find({ loaded: false }, function (err, docs) {
      // if they are newly completed jobs, fetch the data
      clusterInterface.getCompletedJobs(docs).then(function(data) {
        for (var i = 0; i < data.length; i++) {
          db.update(
            { _id: data[i]._id },
            { $set:
              {
              "loaded": true,
              "complete": true,
              "elapsed": data[i].Elapsed,
              "reqMem": data[i].ReqMem,
              "jobName": data[i].JobName
              }
            },
            {},
            function (err, numReplaced) {
              // update db with data so it doesn't have to be queried again
              if(err) console.log("Error updating db: " + err);
              else {
                db.find({ loaded: true }, function (err, docs) {
                  jobList = jobList.concat(docs);
                  if(err) console.log("Error fetching completed jobs: " + err);
                });
              }
            }
          );
        }
      }, function(error) {
        console.log("Error getting completed job data: " + error);
      });
      if(err) console.log("Error fetching completed jobs: " + err);
    });

    // Query the connection service for the cluster
    clusterInterface.getJobs().then(function(data) {
      // Process the data

      $scope.numRunning = data.numRunning;
      $scope.numIdle = data.numIdle;
      $scope.numError = data.numError;
      $scope.jobs = data.jobs.concat(jobList);

      $(".mdi-action-autorenew").removeClass("spinning-image");

    }, function(error) {
      console.log("Error in CTRL: " + error);
    })

    clusterInterface.getStorageInfo().then(function(data) {


      var homeUsageGauge = c3.generate({
        bindto: '#homeUsageGauge',
        data: {
          columns: [
            ['Used', data[0].blocksUsed]
          ],
          type: 'gauge'
        },
        gauge: {
          units: 'Gigabytes',
          label: {
            format: function(value, ratio) {
                return value.toFixed(2);
            }
          },
          max: data[0].blocksQuota,

        },
        color: {
          pattern: [ '#60B044', '#F6C600', '#F97600', '#FF0000' ],
          threshold: {
            values: [30, 60, 90, 100]
          }
        },
        size: {
          height: 180
        }

      });

      var workUsageGauge = c3.generate({
        bindto: '#workUsageGauge',
        data: {
          columns: [
            ['Used', data[1].blocksUsed]
          ],
          type: 'gauge'
        },
        gauge: {
          units: 'Gigabytes',
          label: {
            format: function(value, ratio) {
                return value.toFixed(2);
            }
          },
          max: data[1].blocksLimit,

        },
        color: {
          pattern: [ '#60B044', '#F6C600', '#F97600', '#FF0000' ],
          threshold: {
            values: [30, 60, 90, 100]
          }
        },
        size: {
          height: 180
        }

      });

    });


  }

  preferencesManager.getClusters().then(function(clusters) {
    // Get the cluster type
    var clusterType = $.grep(clusters, function(e) {return e.label == $scope.params.clusterId})[0].type;

    switch (clusterType) {
      case "slurm":
        clusterInterface = new SlurmClusterInterface(connectionService, $q);
        break;
      case "condor":
        clusterInterface = new CondorClusterInterface(connectionService, $q);
        break;
    }

    getClusterStats($scope.params.clusterId);

    // Update the cluster every 15 seconds
    var refreshingPromise;
    var isRefreshing = false;
    $scope.startRefreshing = function(){
      if(isRefreshing) return;
      isRefreshing = true;
      (function refreshEvery(){
        //Do refresh
        getClusterStats($scope.params.clusterId);
        //If async in then in callback do...
        refreshingPromise = $timeout(refreshEvery,15000)
      }());
    };
    $scope.$on('$destroy',function(){
      if(refreshingPromise) {
        $timeout.cancel(refreshingPromise);
      }
    });

    $scope.startRefreshing();
  })


}]);