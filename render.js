var src;
var dest;

function renderStart() {

    var video = document.getElementById('their-video');
    var buffer = document.createElement('canvas');
    var display = document.getElementById('display_canvas');
    var bufferContext = buffer.getContext('2d');
    var displayContext = display.getContext('2d');

    var render = function() {
        requestAnimationFrame(render);
        var width = video.videoWidth;
        var height = video.videoHeight;
        if (width == 0 || height == 0) { return; }

        var re_height1 = parseInt(height / 2 - 3 / 4 * width / 2, 10);
        var re_height2 = parseInt(height / 2 + 3 / 4 * width / 2, 10);

        buffer.width = width;
        display.width = width;
        buffer.height = height;
        display.height = re_height2 - re_height1;
        bufferContext.drawImage(video, 0, 0);

        // src = bufferContext.getImageData(0, 0, width, height); // カメラ画像のデータ
        // dest = bufferContext.createImageData(buffer.width, buffer.height); // 空のデータ（サイズはカメラ画像と一緒）

        src = bufferContext.getImageData(0, re_height1, width, re_height2); // カメラ画像のデータ
        dest = bufferContext.createImageData(src); // 空のデータ（サイズはカメラ画像と一緒）

        duplicate();
        // contrast();
        // edge(width, height);

        displayContext.putImageData(dest, 0, 0);
    };
    render();
}

function duplicate() {
    for (var i = 0; i < dest.data.length; i += 4) {
        dest.data[i + 0] = src.data[i + 0]; // Red
        dest.data[i + 1] = src.data[i + 1]; // Green
        dest.data[i + 2] = src.data[i + 2]; // Blue
        dest.data[i + 3] = 255; // Alpha
    }
}

function contrast() {
    for (var i = 0; i < dest.data.length; i += 4) {
        dest.data[i + 0] = 255 - src.data[i + 0]; // Red
        dest.data[i + 1] = 255 - src.data[i + 1]; // Green
        dest.data[i + 2] = 255 - src.data[i + 2]; // Blue
        dest.data[i + 3] = 255; // Alpha
    }
}

function edge(width, height) {
    for (var y = 1; y < height - 1; y += 1) {
        for (var x = 1; x < width - 1; x += 1) {
            for (var c = 0; c < 3; c += 1) {
                var i = (y * width + x) * 4 + c;
                dest.data[i] = 127 + -src.data[i - width * 4 - 4] - src.data[i - width * 4] - src.data[i - width * 4 + 4] +
                    -src.data[i - 4] + 8 * src.data[i] - src.data[i + 4] +
                    -src.data[i + width * 4 - 4] - src.data[i + width * 4] - src.data[i + width * 4 + 4];
            }
            dest.data[(y * width + x) * 4 + 3] = 255; // Alpha
        }
    }
}