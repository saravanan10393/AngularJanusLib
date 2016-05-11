(function () {
    'use strict';

    angular
        .module('janus')
        .factory('VideoCall', VideoCall);

    VideoCall.$inject = ['$http', 'Constants', '$q'];
    function VideoCall($http, Constants, $q) {
        var isBusy = false, currentHandle = null, feeds = [], janus, roomId, username;
        var service = {
            isBusy: isBusy,
            getSession: getSession,
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

        return service;

        //initilize the januz when factory instantiate and create a session

        ////////////////
        function getSession(roomId) {
            var defferd = $q.defer();
            roomId = roomId || 1234;
            Janus.init({
                debug: "all", callback: function cb() {
                    janus = new Janus({
                        server: serverUrl,
                        success: registerPublisher
                    });
                    defferd.resolve();
                }
            });
            return defferd.promise;
        }

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
            unpublishOwnFeed();
        }

        //////////////
        function dropCall() {
            janus.destroy();
         }


        ///////// function to register publisher //////////////
        function registerPublisher() {
            // Attach to video room test plugin
            janus.attach(
                {
                    plugin: "janus.plugin.videoroom",
                    success: function (pluginHandle) {
                        currentHandle = pluginHandle;
                        Janus.log("Plugin attached! (" + currentHandle.getPlugin() + ", id=" + currentHandle.getId() + ")");
                        Janus.log("  -- This is a publisher/manager");

                        //todo initiate the calling process
                        $('#register').click(registerUsername);

                    },
                    error: function (error) {
                        Janus.error("  -- Error attaching plugin...", error);
                        bootbox.alert("Error attaching plugin... " + error);
                    },
                    consentDialog: function (on) {
                        Janus.debug("Consent dialog should be " + (on ? "on" : "off") + " now");
                        if (on) {
                            // Darken screen and show hint
                            $.blockUI({
                                message: '<div><img src="up_arrow.png"/></div>',
                                css: {
                                    border: 'none',
                                    padding: '15px',
                                    backgroundColor: 'transparent',
                                    color: '#aaa',
                                    top: '10px',
                                    left: (navigator.mozGetUserMedia ? '-100px' : '300px')
                                }
                            });
                        } else {
                            // Restore screen
                            $.unblockUI();
                        }
                    },
                    mediaState: function (medium, on) {
                        Janus.log("Janus " + (on ? "started" : "stopped") + " receiving our " + medium);
                    },
                    webrtcState: function (on) {
                        Janus.log("Janus says our WebRTC PeerConnection is " + (on ? "up" : "down") + " now");
                        $("#videolocal").parent().parent().unblock();
                    },
                    onmessage: function (msg, jsep) {
                        Janus.debug(" ::: Got a message (publisher) :::");
                        Janus.debug(JSON.stringify(msg));
                        var event = msg["videoroom"];
                        Janus.debug("Event: " + event);
                        if (event != undefined && event != null) {
                            if (event === "joined") {
                                // Publisher/manager created, negotiate WebRTC and attach to existing feeds, if any
                                myid = msg["id"];
                                Janus.log("Successfully joined room " + msg["room"] + " with ID " + myid);
                                publishOwnFeed(true);
                                // Any new feed to attach to?
                                if (msg["publishers"] !== undefined && msg["publishers"] !== null) {
                                    var list = msg["publishers"];
                                    Janus.debug("Got a list of available publishers/feeds:");
                                    Janus.debug(list);
                                    for (var f in list) {
                                        var id = list[f]["id"];
                                        var display = list[f]["display"];
                                        Janus.debug("  >> [" + id + "] " + display);
                                        newRemoteFeed(id, display)
                                    }
                                }
                            } else if (event === "destroyed") {
                                // The room has been destroyed
                                Janus.warn("The room has been destroyed!");
                                bootbox.alert(error, function () {
                                    window.location.reload();
                                });
                            } else if (event === "event") {
                                // Any new feed to attach to?
                                if (msg["publishers"] !== undefined && msg["publishers"] !== null) {
                                    var list = msg["publishers"];
                                    Janus.debug("Got a list of available publishers/feeds:");
                                    Janus.debug(list);
                                    for (var f in list) {
                                        var id = list[f]["id"];
                                        var display = list[f]["display"];
                                        Janus.debug("  >> [" + id + "] " + display);
                                        newRemoteFeed(id, display)
                                    }
                                } else if (msg["leaving"] !== undefined && msg["leaving"] !== null) {
                                    // One of the publishers has gone away?
                                    var leaving = msg["leaving"];
                                    Janus.log("Publisher left: " + leaving);
                                    var remoteFeed = null;
                                    for (var i = 1; i < 6; i++) {
                                        if (feeds[i] != null && feeds[i] != undefined && feeds[i].rfid == leaving) {
                                            remoteFeed = feeds[i];
                                            break;
                                        }
                                    }
                                    if (remoteFeed != null) {
                                        Janus.debug("Feed " + remoteFeed.rfid + " (" + remoteFeed.rfdisplay + ") has left the room, detaching");
                                        $('#remote' + remoteFeed.rfindex).empty().hide();
                                        $('#videoremote' + remoteFeed.rfindex).empty();
                                        feeds[remoteFeed.rfindex] = null;
                                        remoteFeed.detach();
                                    }
                                } else if (msg["unpublished"] !== undefined && msg["unpublished"] !== null) {
                                    // One of the publishers has unpublished?
                                    var unpublished = msg["unpublished"];
                                    Janus.log("Publisher left: " + unpublished);
                                    if (unpublished === 'ok') {
                                        // That's us
                                        currentHandle.hangup();
                                        return;
                                    }
                                    var remoteFeed = null;
                                    for (var i = 1; i < 6; i++) {
                                        if (feeds[i] != null && feeds[i] != undefined && feeds[i].rfid == unpublished) {
                                            remoteFeed = feeds[i];
                                            break;
                                        }
                                    }
                                    if (remoteFeed != null) {
                                        Janus.debug("Feed " + remoteFeed.rfid + " (" + remoteFeed.rfdisplay + ") has left the room, detaching");
                                        $('#remote' + remoteFeed.rfindex).empty().hide();
                                        $('#videoremote' + remoteFeed.rfindex).empty();
                                        feeds[remoteFeed.rfindex] = null;
                                        remoteFeed.detach();
                                    }
                                } else if (msg["error"] !== undefined && msg["error"] !== null) {
                                    bootbox.alert(msg["error"]);
                                }
                            }
                        }
                        if (jsep !== undefined && jsep !== null) {
                            Janus.debug("Handling SDP as well...");
                            Janus.debug(jsep);
                            currentHandle.handleRemoteJsep({ jsep: jsep });
                        }
                    },
                    onlocalstream: function (stream) {
                        Janus.debug(" ::: Got a local stream :::");
                        mystream = stream;
                        Janus.debug(JSON.stringify(stream));
                        $('#videolocal').empty();
                        $('#videojoin').hide();
                        $('#videos').removeClass('hide').show();
                        if ($('#myvideo').length === 0) {
                            $('#videolocal').append('<video class="rounded centered" id="myvideo" width="100%" height="100%" autoplay muted="muted"/>');
                            // Add a 'mute' button
                            $('#videolocal').append('<button class="btn btn-warning btn-xs" id="mute" style="position: absolute; bottom: 0px; left: 0px; margin: 15px;">Mute</button>');
                            $('#mute').click(toggleMute);
                            // Add an 'unpublish' button
                            $('#videolocal').append('<button class="btn btn-warning btn-xs" id="unpublish" style="position: absolute; bottom: 0px; right: 0px; margin: 15px;">Unpublish</button>');
                            $('#unpublish').click(unpublishOwnFeed);
                        }
                        $('#publisher').removeClass('hide').html(myusername).show();
                        attachMediaStream($('#myvideo').get(0), stream);
                        $("#myvideo").get(0).muted = "muted";
                        $("#videolocal").parent().parent().block({
                            message: '<b>Publishing...</b>',
                            css: {
                                border: 'none',
                                backgroundColor: 'transparent',
                                color: 'white'
                            }
                        });
                        var videoTracks = stream.getVideoTracks();
                        if (videoTracks === null || videoTracks === undefined || videoTracks.length === 0) {
                            // No webcam
                            $('#myvideo').hide();
                            $('#videolocal').append(
                                '<div class="no-video-container">' +
                                '<i class="fa fa-video-camera fa-5 no-video-icon" style="height: 100%;"></i>' +
                                '<span class="no-video-text" style="font-size: 16px;">No webcam available</span>' +
                                '</div>');
                        }
                    },
                    onremotestream: function (stream) {
                        // The publisher stream is sendonly, we don't expect anything here
                    },
                    oncleanup: function () {
                        Janus.log(" ::: Got a cleanup notification: we are unpublished now :::");
                        mystream = null;
                        $('#videolocal').html('<button id="publish" class="btn btn-primary">Publish</button>');
                        $('#publish').click(function () { publishOwnFeed(true); });
                        $("#videolocal").parent().parent().unblock();
                    }
                });
        }
        ///// ends///////

        //////publish stream/////
        function publishOwnFeed(useAudio) {
            // Publish our stream
            currentHandle.createOffer(
                {
                    media: { audioRecv: false, videoRecv: false, audioSend: useAudio, videoSend: true },	// Publishers are sendonly
                    success: function (jsep) {
                        Janus.debug("Got publisher SDP!");
                        Janus.debug(jsep);
                        var publish = { "request": "configure", "audio": useAudio, "video": true };
                        currentHandle.send({ "message": publish, "jsep": jsep });
                    },
                    error: function (error) {
                        Janus.error("WebRTC error:", error);
                        if (useAudio) {
                            publishOwnFeed(false);
                        } else {
                            bootbox.alert("WebRTC error... " + JSON.stringify(error));
                            //re call publishOwnFeed with audio enabled optinos
                            //$('#publish').removeAttr('disabled').click(function () { publishOwnFeed(true); });
                        }
                    }
                });
        }
        ///ends//////

        ///// unpublish stream///////// 
        function unpublishOwnFeed() {
            // Unpublish our stream
            $('#unpublish').attr('disabled', true).unbind('click');
            var unpublish = { "request": "unpublish" };
            sfutest.send({ "message": unpublish });
        }
        /////ends/////////

        ////////create remote streem//////
        function newRemoteFeed(id, display) {
            // A new feed has been published, create a new plugin handle and attach to it as a listener
            var remoteFeed = null;
            janus.attach(
                {
                    plugin: "janus.plugin.videoroom",
                    success: function (pluginHandle) {
                        remoteFeed = pluginHandle;
                        Janus.log("Plugin attached! (" + remoteFeed.getPlugin() + ", id=" + remoteFeed.getId() + ")");
                        Janus.log("  -- This is a subscriber");
                        // We wait for the plugin to send us an offer
                        var listen = { "request": "join", "room": roomId, "ptype": "listener", "feed": id };
                        remoteFeed.send({ "message": listen });
                    },
                    error: function (error) {
                        Janus.error("  -- Error attaching plugin...", error);
                        bootbox.alert("Error attaching plugin... " + error);
                    },
                    onmessage: function (msg, jsep) {
                        Janus.debug(" ::: Got a message (listener) :::");
                        Janus.debug(JSON.stringify(msg));
                        var event = msg["videoroom"];
                        Janus.debug("Event: " + event);
                        if (event != undefined && event != null) {
                            if (event === "attached") {
                                // Subscriber created and attached
                                for (var i = 1; i < 6; i++) {
                                    if (feeds[i] === undefined || feeds[i] === null) {
                                        feeds[i] = remoteFeed;
                                        remoteFeed.rfindex = i;
                                        break;
                                    }
                                }
                                remoteFeed.rfid = msg["id"];
                                remoteFeed.rfdisplay = msg["display"];
                                if (remoteFeed.spinner === undefined || remoteFeed.spinner === null) {
                                    var target = document.getElementById('videoremote' + remoteFeed.rfindex);
                                    remoteFeed.spinner = new Spinner({ top: 100 }).spin(target);
                                } else {
                                    remoteFeed.spinner.spin();
                                }
                                Janus.log("Successfully attached to feed " + remoteFeed.rfid + " (" + remoteFeed.rfdisplay + ") in room " + msg["room"]);
                                $('#remote' + remoteFeed.rfindex).removeClass('hide').html(remoteFeed.rfdisplay).show();
                            } else if (msg["error"] !== undefined && msg["error"] !== null) {
                                bootbox.alert(msg["error"]);
                            } else {
                                // What has just happened?
                            }
                        }
                        if (jsep !== undefined && jsep !== null) {
                            Janus.debug("Handling SDP as well...");
                            Janus.debug(jsep);
                            // Answer and attach
                            remoteFeed.createAnswer(
                                {
                                    jsep: jsep,
                                    media: { audioSend: false, videoSend: false },	// We want recvonly audio/video
                                    success: function (jsep) {
                                        Janus.debug("Got SDP!");
                                        Janus.debug(jsep);
                                        var body = { "request": "start", "room": 1234 };
                                        remoteFeed.send({ "message": body, "jsep": jsep });
                                    },
                                    error: function (error) {
                                        Janus.error("WebRTC error:", error);
                                        bootbox.alert("WebRTC error... " + JSON.stringify(error));
                                    }
                                });
                        }
                    },
                    webrtcState: function (on) {
                        Janus.log("Janus says this WebRTC PeerConnection (feed #" + remoteFeed.rfindex + ") is " + (on ? "up" : "down") + " now");
                    },
                    onlocalstream: function (stream) {
                        // The subscriber stream is recvonly, we don't expect anything here
                    },
                    onremotestream: function (stream) {
                        Janus.debug("Remote feed #" + remoteFeed.rfindex);
                        if ($('#remotevideo' + remoteFeed.rfindex).length === 0) {
                            // No remote video yet
                            $('#videoremote' + remoteFeed.rfindex).append('<video class="rounded centered" id="waitingvideo' + remoteFeed.rfindex + '" width=320 height=240 />');
                            $('#videoremote' + remoteFeed.rfindex).append('<video class="rounded centered relative hide" id="remotevideo' + remoteFeed.rfindex + '" width="100%" height="100%" autoplay/>');
                        }
                        $('#videoremote' + remoteFeed.rfindex).append(
                            '<span class="label label-primary hide" id="curres' + remoteFeed.rfindex + '" style="position: absolute; bottom: 0px; left: 0px; margin: 15px;"></span>' +
                            '<span class="label label-info hide" id="curbitrate' + remoteFeed.rfindex + '" style="position: absolute; bottom: 0px; right: 0px; margin: 15px;"></span>');
                        // Show the video, hide the spinner and show the resolution when we get a playing event
                        $("#remotevideo" + remoteFeed.rfindex).bind("playing", function () {
                            if (remoteFeed.spinner !== undefined && remoteFeed.spinner !== null)
                                remoteFeed.spinner.stop();
                            remoteFeed.spinner = null;
                            $('#waitingvideo' + remoteFeed.rfindex).remove();
                            $('#remotevideo' + remoteFeed.rfindex).removeClass('hide');
                            var width = this.videoWidth;
                            var height = this.videoHeight;
                            $('#curres' + remoteFeed.rfindex).removeClass('hide').text(width + 'x' + height).show();
                            if (webrtcDetectedBrowser == "firefox") {
                                // Firefox Stable has a bug: width and height are not immediately available after a playing
                                setTimeout(function () {
                                    var width = $("#remotevideo" + remoteFeed.rfindex).get(0).videoWidth;
                                    var height = $("#remotevideo" + remoteFeed.rfindex).get(0).videoHeight;
                                    $('#curres' + remoteFeed.rfindex).removeClass('hide').text(width + 'x' + height).show();
                                }, 2000);
                            }
                        });
                        attachMediaStream($('#remotevideo' + remoteFeed.rfindex).get(0), stream);
                        var videoTracks = stream.getVideoTracks();
                        if (videoTracks === null || videoTracks === undefined || videoTracks.length === 0 || videoTracks[0].muted) {
                            // No remote video
                            $('#remotevideo' + remoteFeed.rfindex).hide();
                            $('#videoremote' + remoteFeed.rfindex).append(
                                '<div class="no-video-container">' +
                                '<i class="fa fa-video-camera fa-5 no-video-icon" style="height: 100%;"></i>' +
                                '<span class="no-video-text" style="font-size: 16px;">No remote video available</span>' +
                                '</div>');
                        }
                        if (webrtcDetectedBrowser == "chrome" || webrtcDetectedBrowser == "firefox") {
                            $('#curbitrate' + remoteFeed.rfindex).removeClass('hide').show();
                            bitrateTimer[remoteFeed.rfindex] = setInterval(function () {
                                // Display updated bitrate, if supported
                                var bitrate = remoteFeed.getBitrate();
                                $('#curbitrate' + remoteFeed.rfindex).text(bitrate);
                            }, 1000);
                        }
                    },
                    oncleanup: function () {
                        Janus.log(" ::: Got a cleanup notification (remote feed " + id + ") :::");
                        if (remoteFeed.spinner !== undefined && remoteFeed.spinner !== null)
                            remoteFeed.spinner.stop();
                        remoteFeed.spinner = null;
                        $('#waitingvideo' + remoteFeed.rfindex).remove();
                        $('#curbitrate' + remoteFeed.rfindex).remove();
                        $('#curres' + remoteFeed.rfindex).remove();
                        if (bitrateTimer[remoteFeed.rfindex] !== null && bitrateTimer[remoteFeed.rfindex] !== null)
                            clearInterval(bitrateTimer[remoteFeed.rfindex]);
                        bitrateTimer[remoteFeed.rfindex] = null;
                    }
                });
        }
        ////ends////
    }
})();