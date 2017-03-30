preferencesModule = angular.module('HccGoApp.preferencesCtrl', ['ngRoute' ]);

/**
 * This controller is responsible for displaying the current settings and updating
 * them when the user makes changes.
 *
 * @ngdoc controller
 * @memberof HCCGo
 * @class preferencesCtrl
 * @requires $scope
 * @requires $log
 * @requires preferencesService
 */
preferencesModule.controller('preferencesCtrl', ['$scope', '$log', 'preferencesManager', function($scope, $log, preferencesManager) {

  $(function() {
    $('#toggle-one').bootstrapToggle({
      on: 'Slurm',
      off: 'Condor',
      offstyle: 'info'
    });
  })

}]);
