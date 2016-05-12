(function () {
    'use strict';

    angular
        .module('janus')
        .factory('VideoCall', VideoCall);

    VideoCall.$inject = ['$http', '$q'];
    function VideoCall($http,  $q) {
        //initialize the janus
        var videoCaller = new Janus.VideoHelper('http://janus.conf.meetecho.com:8088/janus','#video-container');
        var roomId = 12345;      
        var service = {
            isBusy: false,
            call: call,
            pickCall: pickCall,
            addToCall: addToCall,
            toggleAudio: toggleAudio,
            toggleVideo: toggleVideo,
            dropCall: dropCall
        };
              
        return service;
                
        //initilize the januz when factory instantiate and create a session

        ////////////////
        function call(name,rId) {
           roomId = rId || roomId;
           videoCaller.call(roomId,name);
           //send socket message to listener;
        };

        ///////////////
        function pickCall(roomId,name) {
            // publish his own stream on given roomId
            // create an offer to given particular roomId
            call(roomId,name);
        };

        ///////////////
        function addToCall(member) {
            //create a group in db for messages for joined 3 people
            //simply send socket message to user to show popup to join in this call. //raise waring if he already in another call
            //when he pick up call publish his own stream to current call roomId
            //send scoket message;
        }

        ///////////////
        function toggleAudio() {
           videoCaller.toggleMuteAudio();
        }

        //////////////
        function toggleVideo() {
            videoCaller.toggleMuteVideo();
        }

        //////////////
        function dropCall() {
            videoCaller.cut();
        }
    }

})();