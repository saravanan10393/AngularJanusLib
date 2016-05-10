(function() {
'use strict';

    angular
        .module('janus')
        .factory('VideoCall', VideoCall);

    VideoCall.$inject = ['$http'];
    function VideoCall($http) {
        var service = {
            call:call,
            addToCall : addToCall,
            muteAudio : muteAudio,
            unMuteAudio : unMuteAudio,
            enableVideo : enableVideo,
            disableVideo : disableVideo,
            dropCall : dropCall
        };
        
        return service;

        ////////////////
        function call() {
            
         }
        
        ///////////////
        function addToCall() { }
        
        ///////////////
        function muteAudio() { }
        
        ///////////////
        function unMuteAudio() { }
        
        //////////////
        function enableVideo() { }
        
        ///////////////
        function disableVideo() { }
        
        //////////////
        function dropCall() { }
        
        
    }
})();