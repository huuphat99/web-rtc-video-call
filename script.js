'use strict';

let dataConnection;
let jsonMetadata = null;

let calling = false;

$(function() {

    const peer = new Peer({
        key: '50177f5e-e3db-48e4-934a-90ffb8f9f043',
        debug: 3
    });

    let localStream = null;
    let existingCall = null;

    peer.on('open', function() {
        $('#my-id').text(peer.id);
        step1();

        peer.listAllPeers(function(peers) {
            let listPeerIds = [];
            for (let i = 0; i < peers.length; i++) {
                let peerId = peers[i];
                if (peer.id != peerId) {
                    listPeerIds.push(peerId)
                    var container = document.getElementById("peerList");
                    var item = document.createElement("li");
                    item.className = 'mdl-list__item';
                    item.innerHTML = '<span class="mdl-list__item-primary-content"><i class="material-icons mdl-list__item-icon">person</i>' + listPeerIds[i] + '</span>';
                    container.appendChild(item);
                }
            }
        });
    });

    peer.on('call', function(call) {
        call.answer(localStream, {
            videoBandwidth: 2000,
            videoCodec: 'VP9'
        });
        step3(call);

        calling = true;
        // Popup for Emergency Call
        // alert("Emergency Call!!!");
        // show popupボタンクリック時の処理
        $('#popup, #layer').show();

        if (typeof call.metadata == "string") {
            $('#debug').text(call.metadata);
            localStorage.setItem("jsonMetadata", jsonMetadata);
            jsonMetadata = JSON.parse(call.metadata);
        } else if (typeof call.metadata == "object") {
            jsonMetadata = call.metadata;
            $('#debug').text(JSON.stringify(jsonMetadata));
        } else {
            $('#debug').text(typeof call.metadata);
        }

        setInfo(jsonMetadata);
    });

    function setInfo(json) {
        $('#target_name').append(json.name);
        $('#target_age').append(json.age);
        $('#target_msg').append(json.msg);
        updateMap();

        // Basic Information
        $('#tb_name').text(json.name);
        $('#tb_kana').text(json.kana);
        $('#tb_age').text(json.age);
        $('#tb_birth').text(json.birth);
        $('#tb_bloodtype').text(json.bloodtype);
        $('#tb_sex').text(json.sex);
        $('#tb_address').text(json.address);
        $('#tb_phone').text(json.phone);

        // Emergency Information
        $('#tb_em_name').text(json.em_name);
        $('#tb_em_relation').text(json.em_relation);
        $('#tb_em_address').text(json.em_address);
        $('#tb_em_phone').text(json.em_phone);
    }

    peer.on('error', function(err) {
        alert(err.message);
        step2();
    });

    peer.on('disconnected', function() {});

    $('#make-call').submit(function(e) {
        e.preventDefault();
        const call = peer.call($('#callto-id').val(), localStream, {
            metadata: {
                name: checkBrowser() + " on " + checkOs()
            },
            videoBandwidth: 2000,
            videoCodec: 'VP9'
        });
        dataConnection = peer.connect($('#callto-id').val());
        dataConnection.on("open", function() {
            $("#debug").append($("<p>").text(dataConnection.id + ": Data connection is open."));
        });
        dataConnection.on("data", function() {
            $("#debug").append($("<p>").text(dataConnection.id + ": " + data).css("font-weight", "bold"));
        });
        step3(call);
    });

    $('#end-call').click(function() {
        existingCall.close();
        dataConnection.close();
        step2();
    });

    peer.on('connection', 　function(connection) {
        dataConnection = connection;
        dataConnection.on("open", function() {
            $("#debug").append($("<p>").text(dataConnection.id + ": Data connection is open"));
        });
        dataConnection.on('data', function onRecvMessage(data) {
            $("#messages").append($("<p>").text(dataConnection.id + ": " + data).css("font-weight", "bold"));
        });
    });


    //
    // Close Popup
    $('#close, #layer').click(function() {
        $('#popup, #layer').hide();
    });

    //
    // Remote Control
    //
    $('#left_button').click(function() {
        var message = "LEFT";
        dataConnection.send(message);
        $("#messages").append($("<p>").html(peer.id + ": " + message));
    });
    $('#down_button').click(function() {
        var message = "DOWN";
        dataConnection.send(message);
        $("#messages").append($("<p>").html(peer.id + ": " + message));
    });
    $('#up_button').click(function() {
        var message = "UP";
        dataConnection.send(message);
        $("#messages").append($("<p>").html(peer.id + ": " + message));
    });
    $('#right_button').click(function() {
        var message = "RIGHT"
        dataConnection.send(message);
        $("#messages").append($("<p>").html(peer.id + ": " + message));
    });

    // set up audio and video input selectors
    const audioSelect = $('#audioSource');
    const videoSelect = $('#videoSource');
    const selectors = [audioSelect, videoSelect];

    navigator.mediaDevices.enumerateDevices()
        .then(deviceInfos => {
            const values = selectors.map(select => select.val() || '');
            selectors.forEach(select => {
                const children = select.children(':first');
                while (children.length) {
                    select.remove(children);
                }
            });

            for (let i = 0; i !== deviceInfos.length; ++i) {
                const deviceInfo = deviceInfos[i];
                const option = $('<option>').val(deviceInfo.deviceId);

                if (deviceInfo.kind === 'audioinput') {
                    option.text(deviceInfo.label ||
                        'Microphone ' + (audioSelect.children().length + 1));
                    audioSelect.append(option);
                } else if (deviceInfo.kind === 'videoinput') {
                    option.text(deviceInfo.label ||
                        'Camera ' + (videoSelect.children().length + 1));
                    videoSelect.append(option);
                }
            }

            selectors.forEach((select, selectorIndex) => {
                if (Array.prototype.slice.call(select.children()).some(n => {
                        return n.value === values[selectorIndex];
                    })) {
                    select.val(values[selectorIndex]);
                }
            });

            videoSelect.on('change', step1);
            audioSelect.on('change', step1);
        });

    function step1() {
        // Get audio/video stream
        const audioSource = $('#audioSource').val();
        const videoSource = $('#videoSource').val();
        const constraints = {
            audio: { deviceId: audioSource ? { exact: audioSource } : undefined },
            video: { deviceId: videoSource ? { exact: videoSource } : undefined },
        };

        navigator.mediaDevices.getUserMedia(constraints).then(stream => {
            // Success
            $('#my-video').get(0).srcObject = stream;
            localStream = stream;

            if (existingCall) {
                existingCall.replaceStream(stream);
                return;
            }

            step2();
        }).catch(err => {
            // Error
            console.error('mediaDevice.getUserMedia() error:', err);
        });
    }

    function step2() {
        $('#step1, #step3').hide();
        $('#step2').show();
        $('#callto-id').focus();
    }

    function step3(call) {
        // Hang up on an existing call if present
        if (existingCall) {
            existingCall.close();
        }
        // Wait for stream on the call, then set peer video display
        call.on('stream', stream => {
            const el = $('#their-video').get(0);
            el.srcObject = stream;
            el.play();
            renderStart();
        });
        // UI stuff
        existingCall = call;
        $('#their-id').text(call.remoteId);
        call.on('close', step2);
        $('#step1, #step2').hide();
        $('#step3').show();
    }
});



function checkOs() {
    let os, ua = navigator.userAgent;

    if (ua.match(/Win(dows )?NT 10\.0/)) {
        os = "Windows 10"; // Windows 10 の処理
    } else if (ua.match(/Win(dows )?NT 6\.3/)) {
        os = "Windows 8.1"; // Windows 8.1 の処理
    } else if (ua.match(/Win(dows )?NT 6\.2/)) {
        os = "Windows 8"; // Windows 8 の処理
    } else if (ua.match(/Win(dows )?NT 6\.1/)) {
        os = "Windows 7"; // Windows 7 の処理
    } else if (ua.match(/Win(dows )?NT 6\.0/)) {
        os = "Windows Vista"; // Windows Vista の処理
    } else if (ua.match(/Win(dows )?NT 5\.2/)) {
        os = "Windows Server 2003"; // Windows Server 2003 の処理
    } else if (ua.match(/Win(dows )?(NT 5\.1|XP)/)) {
        os = "Windows XP"; // Windows XP の処理
    } else if (ua.match(/Win(dows)? (9x 4\.90|ME)/)) {
        os = "Windows ME"; // Windows ME の処理
    } else if (ua.match(/Win(dows )?(NT 5\.0|2000)/)) {
        os = "Windows 2000"; // Windows 2000 の処理
    } else if (ua.match(/Win(dows )?98/)) {
        os = "Windows 98"; // Windows 98 の処理
    } else if (ua.match(/Win(dows )?NT( 4\.0)?/)) {
        os = "Windows NT"; // Windows NT の処理
    } else if (ua.match(/Win(dows )?95/)) {
        os = "Windows 95"; // Windows 95 の処理
    } else if (ua.match(/iPhone|iPad/)) {
        os = "iOS"; // iOS (iPhone, iPod touch, iPad) の処理

        /*
        if (ua.match(/(iPhone|CPU) OS ([\d_]+)/)) {
        os = "iOS " + RegExp.$2;
        os = os.replace(/_/g, ".");
      }
      else {
      os = "iOS";
    }
    */
    } else if (ua.match(/Mac|PPC/)) {
        os = "Mac OS"; // Macintosh の処理

        /*
    if (ua.match(/OS X|MSIE 5\.2/)) {
    if (ua.match(/Mac OS X ([\.\d_]+)/)) {
    os = "macOS " + RegExp.$1;
    os = os.replace(/_/g, ".");
  }
  else {
  os = "macOS";
}
}
else {
os = "Classic Mac OS";
}
*/
    } else if (ua.match(/Android ([\.\d]+)/)) {
        os = "Android " + RegExp.$1; // Android の処理
    } else if (ua.match(/Linux/)) {
        os = "Linux"; // Linux の処理
    } else if (ua.match(/^.*\s([A-Za-z]+BSD)/)) {
        os = RegExp.$1; // BSD 系の処理
    } else if (ua.match(/SunOS/)) {
        os = "Solaris"; // Solaris の処理
    } else {
        os = "N/A"; // 上記以外 OS の処理
    }

    return os;
}

function checkBrowser() {

    let result = 'Unknown';

    let agent = navigator.userAgent.toLowerCase();
    let version = navigator.appVersion.toLowerCase();

    if (agent.indexOf("msie") > -1) {
        if (version.indexOf("msie 6.") > -1) {
            result = 'IE6';
        } else if (version.indexOf("msie 7.") > -1) {
            result = 'IE7';
        } else if (version.indexOf("msie 8.") > -1) {
            result = 'IE8';
        } else if (version.indexOf("msie 9.") > -1) {
            result = 'IE9';
        } else if (version.indexOf("msie 10.") > -1) {
            result = 'IE10';
        } else {
            result = 'IE(バージョン不明)';
        }
    } else if (agent.indexOf("trident/7") > -1) {
        result = 'IE11';
    } else if (agent.indexOf("edge") > -1) {
        result = 'Edge';
    } else if (agent.indexOf("chrome") > -1) {
        result = 'Chrome';
    } else if (agent.indexOf("safari") > -1) {
        result = 'Safari';
    } else if (agent.indexOf("opera") > -1) {
        result = 'Opera';
    } else if (agent.indexOf("firefox") > -1) {
        result = 'Firefox';
    }

    return result;
}