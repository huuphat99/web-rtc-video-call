var conn;

var peer = new Peer({
    key: '50177f5e-e3db-48e4-934a-90ffb8f9f043',
    debug: 3
});

peer.on('open', function(){
    $('#my-id').text(peer.id);
});

peer.on('error', function(err){
    alert(err.message);
});

peer.on('connection',
	function(connection) {
		conn = connection;
		conn.on("open", function() {
			$("#peer-id").text(conn.id);
		});
		conn.on('data', onRecvMessage);
});

function onRecvMessage(data) {
	$("#messages").append($("<p>").text(conn.id + ": " + data).css("font-weight", "bold"));
}

$(function() {
	$("#connect").click(function() {
		var peer_id = $('#peer-id-input').val();
		conn = peer.connect(peer_id);
		conn.on("open", function() {
			$("#peer-id").text(conn.id);
		});
		conn.on("data", onRecvMessage);
	});

	$("#send").click(function() {
		var message = $("#message").val();
		conn.send(message);
		$("#messages").append($("<p>").html(peer.id + ": " + message));
		$("#message").val("");
	});

	$("#close").click(function() {
		conn.close();
	});
});