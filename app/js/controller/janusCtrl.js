(function() {
'use strict';

    angular
        .module('janus')
        .controller('videoCallCtrl', videoCallCtrl);

    videoCallCtrl.$inject = ['$scope','VideoCall'];
    function videoCallCtrl($scope,VideoCall) {
        var vm = this,roomId = 12345;
        vm.currentUser = null;
        
        vm.call = function(to){
            VideoCall.call("saravanan");
           // socket.emit('call:outgoing',roomId);
        };
        
        vm.cut = function(){
            VideoCall.cut();
        }
        
        vm.toggleAudio = function(){
            VideoCall.toggleAudio(function(status){
               //change ui; 
            });
        };
        
        vm.toggleVideo = function(){
            VideoCall.toggleVideo(function(status){
               //change ui; 
            });
        };
        
        // socket.on('call:incomming',function(roomId){
        //    if(VideoCall.isBusy){
        //        socket.emit('user:busy',"userBusy");
        //        return;
        //    }
        //    console.log('call is comming and auto attending call to roomId ',roomId);
        //    VideoCall.pickCall(roomId);
        // });
    }
})();