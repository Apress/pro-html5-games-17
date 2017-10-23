/*
 * wAudio.js v1.1.0
 * https://github.com/adityaravishankar/wAudio.js
 *
 * (c) 2017, Aditya Ravi Shankar (www.adityaravishankar.com)
 *
 * MIT License
 *
 */

(function() {
    "use strict";

    if (typeof window.AudioContext === "undefined" && typeof window.webkitAudioContext === "undefined") {
        console.warn("No AudioContext found. wAudio will not be created.");

        return;
    }

    var audioContext = new (window.AudioContext || window.webkitAudioContext)();

    var bufferCache = {};

    var wAudio = function(srcString) {

        /* Emulate Event Handlers */
        this._listeners = {
            "canplay": [],
            "canplaythrough": [],
            "ended": []
        };

        this.init(srcString);
    };

    // Hack for Mobiles that needsa sound to be played on a user event to unlock audio
    wAudio.playMutedSound = function() {
        var oscillator = audioContext.createOscillator();
        var gainNode = audioContext.createGain();

        gainNode.gain.value = 0;

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.001);
    };

    // Try to automatically run playMutedSound() on the first touchend event if enabled
    wAudio.mobileAutoEnable = false;

    var isMobile = /iPhone|iPad|iPod|Android|BlackBerry|BB10|Silk|Mobi/i.test(self._navigator && self._navigator.userAgent);
    var isTouch = !!(("ontouchend" in window) || (self._navigator && self._navigator.maxTouchPoints > 0) || (self._navigator && self._navigator.msMaxTouchPoints > 0));

    if (isMobile && isTouch) {

        var unlockAudio = function() {
            if (wAudio.mobileAutoEnable) {
                wAudio.playMutedSound();
            }

            // Remove the touchend listener.
            document.removeEventListener("touchend", unlockAudio, true);
        };

        document.addEventListener("touchend", unlockAudio, true);
    }

    wAudio.prototype = {
        _src: undefined,
        _buffer: undefined,

        get src() {
            return this._src;
        },

        set src(srcString) {
            if (this._src !== srcString) {
                this._src = srcString;

                this._buffer = undefined;
                this._bufferSource = undefined;

                // Loading the Audio
                if (this._src) {
                    this._loadAudio();
                }

            }
        },

        get currentSrc() {
            if (this._src && !/^data:[^;]+;base64,/.test(this._src)) {
                var link = document.createElement("a");

                link.href = this._src;

                return link.href;
            } else {
                return this._src;
            }
        },


        _loadAudio: function() {
            var url = this._src;
            var self = this;

            if (/^data:[^;]+;base64,/.test(url)) {
                // Decode the base64 data URI without XHR
                var data = atob(url.split(",")[1]);
                var dataView = new Uint8Array(data.length);

                for (var i = 0; i < data.length; ++i) {
                    dataView[i] = data.charCodeAt(i);
                }

                var undecodedAudio = dataView.buffer;

                audioContext.decodeAudioData(undecodedAudio, function (buffer) {
                    self._loadBuffer(buffer);
                });
            } else if (document.location.protocol === "file:" || /^file:/.test(url)) {
                throw "Cannot load audio from file:// URLs.";
            } else {
                var request = new XMLHttpRequest();

                if (bufferCache[url]) {
                    if (bufferCache[url].buffer) {
                        setTimeout(function() {
                            self._loadBuffer(bufferCache[url].buffer);
                        }, 0);

                    } else {
                        bufferCache[url].listeners.push(self);
                    }
                } else {
                    bufferCache[url] = {
                        buffer: undefined,
                        listeners: [self]
                    };
                    request.open("GET", url, true);
                    request.responseType = "arraybuffer";
                    request.onload = function() {
                        var undecodedAudio = request.response;

                        audioContext.decodeAudioData(undecodedAudio, function (buffer) {
                            bufferCache[url].buffer = buffer;
                            for (var i = bufferCache[url].listeners.length - 1; i >= 0 ; i--) {
                                var listener = bufferCache[url].listeners[i];

                                listener._loadBuffer(buffer);
                            }

                            delete bufferCache[url].listeners;
                        });
                    };

                    request.send();

                }
            }
        },

        _loadBuffer: function(buffer) {
            this._buffer = buffer;

            this.dispatchEvent({
                type: "canplay",
                target: this
            });

            this.dispatchEvent({
                type: "canplaythrough",
                target: this
            });

            if (this._muted) {
                this._volume = 0;
            }

            if (this._autoplay) {
                this.play();
            }
        },

        get readyState() {
            if (this._bufferSource) {
                // HAVE_ENOUGH_DATA  4   Enough data is available—and the download rate is high enough—that the media can be played through to the end without interruption.
                return 4;
            } else {
                // HAVE_NOTHING 0   No information is available about the media resource.
                return 0;
            }
        },

        _autoplay: false,

        get autoplay() {
            return this._autoplay;
        },

        set autoplay(value) {
            this._autoplay = !!value;
        },

        _muted: false,
        get muted() {
            return this._muted;
        },

        set muted(value) {
            this._muted = !!value;
        },

        init: function(srcString) {
            if (srcString) {
                this.src = srcString;
            }
            this._currentTime = 0;
        },

        _bufferSource: undefined,
        _gainNode: undefined,

        _playTime: undefined,
        _currentTime: 0,

        get currentTime() {
            if (this._bufferSource) {
                return this._currentTime + audioContext.currentTime - this._playTime;
            } else {
                return this._currentTime;
            }
        },

        set currentTime(newTime) {
            var playing;

            if (this._bufferSource) {
                playing = true;
                this.pause();
            }

            this._currentTime = newTime;
            if (playing) {
                this.play();
            }
        },

        _loop: false,

        get loop() {
            return this._loop;
        },

        set loop(value) {
            if (typeof value === "boolean") {
                this._loop = value;
            }
        },

        _volume: 1,

        get volume() {
            return this._volume;
        },

        set volume(value) {
            if (typeof value === "number" && value >= 0 && value <= 1) {
                this._volume = value;
                if (this._gainNode) {
                    this._gainNode.gain.value = this._volume;
                }
            }
        },

        get paused() {
            return this._bufferSource === undefined;
        },

        play: function() {
            if (this._buffer && !this._bufferSource) {
                this._bufferSource = audioContext.createBufferSource();
                this._gainNode = audioContext.createGain();
                this._gainNode.gain.value = this._volume;

                this._bufferSource.buffer = this._buffer;
                this._bufferSource.connect(this._gainNode);
                this._gainNode.connect(audioContext.destination);

                this._playTime = audioContext.currentTime;
                this._bufferSource.start(0, this._currentTime); // When, Offset, Duration

                this._bufferSource.onended = this._ended.bind(this);
            } else if (this._src) { // Source has been set, just not loaded yet. Auto play it
                this.autoplay = true;
            }
        },

        pause: function() {
            if (this._bufferSource) {
                this._bufferSource.onended = undefined;
                this._bufferSource.stop(0);
                this._currentTime += audioContext.currentTime - this._playTime;
                this._reset();
            }
        },

        stop: function() {
            if (this._bufferSource) {
                this._bufferSource.onended = undefined;
                this._bufferSource.stop(0);
                this._reset();
                this._currentTime = 0;
            } else {
                throw ("could not stop for some reason");
            }
        },

        _ended: function() {
            this._reset();
            this._currentTime = 0;
            if (this._loop) {
                this.play();
            } else {
                this.dispatchEvent({
                    type: "ended",
                    target: this
                });
            }
        },
        _reset: function() {
            this._playTime = undefined;
            this._bufferSource = undefined;
            this._gainNode = undefined;
        },

        addEventListener: function(eventType, method) {
            if (this._listeners.hasOwnProperty(eventType)) {
                this._listeners[eventType].push(method);
            } else {
                throw "Invalid Event Type: " + eventType;
            }
        },

        removeEventListener: function(eventType, method) {
            if (this._listeners.hasOwnProperty(eventType)) {
                for (var i = this._listeners[eventType].length - 1; i >= 0 ; i--) {
                    if (this._listeners[eventType][i] === method) {
                        this._listeners[eventType].splice(i, 1);
                        break;
                    }
                }
            } else {
                throw "Invalid Event Type: " + eventType;
            }
        },

        dispatchEvent: function(event) {
            var eventType = event.type;

            if (this._listeners.hasOwnProperty(eventType)) {
                for (var i = this._listeners[eventType].length - 1; i >= 0 ; i--) {
                    this._listeners[eventType][i](event);
                }
            }
        }

    };

    window.wAudio = wAudio;

})();