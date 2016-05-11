(function () {
    'use strict';

    angular
        .module('janus')
        .factory('VideoCall', VideoCall);

    VideoCall.$inject = ['$http', 'Constants', '$q'];
    function VideoCall($http, Constants, $q) {
        //initialize the janus
        var videoCaller = new Janus.VideoHelper(Math.random() * 1000);
              
        var service = {
            isBusy: false,
            destroy: destroy,
            call: call,
            pickCall: pickCall,
            addToCall: addToCall,
            muteAudio: muteAudio,
            unMuteAudio: unMuteAudio,
            enableVideo: enableVideo,
            disableVideo: disableVideo,
            dropCall: dropCall
        };
        
        videoCaller.init('https://janus.conf.meetecho.com:8088/janus').done(function cb(status) {
            service.isReady = true;
        });
        
        return service;
                
        //initilize the januz when factory instantiate and create a session

        ////////////////
        function call(toWhom) {
            //generate a roomId hint : use roomId as group for recording
            // use already existing message way..
            //publish his own stream
            // create a janus offer to start attach to gateway
            // and send socket message to concerned user to raise call popup;     

            var register = { "request": "join", "room": roomId, "ptype": "publisher", "display": username };

            currentHandle.send({ "message": register });

        }

        ///////////////
        function pickCall(roomId) {
            // publish his own stream on given roomId
            // create an offer to given particular roomId
        }

        ///////////////
        function addToCall(member) {
            //create a group in db for messages for joined 3 people
            //simply send socket message to user to show popup to join in this call. //raise waring if he already in another call
            //when he pick up call publish his own stream to current call roomId
        }

        ///////////////
        function muteAudio() {
            var muted = currentHandle.isAudioMuted();
            Janus.log((muted ? "Unmuting" : "Muting") + " local stream...");
            if (muted)
                currentHandle.unmuteAudio();
            else
                currentHandle.muteAudio();
        }

        ///////////////
        function unMuteAudio() { }

        //////////////
        function enableVideo() { }

        ///////////////
        function disableVideo() {
           
        }

        //////////////
        function dropCall() {
            janus.destroy();
         }
    }

})();