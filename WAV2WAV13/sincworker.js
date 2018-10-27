self.addEventListener("message", (message) => {
    var inRate = message.data.inRate;
    var outRate = message.data.outRate;

    var retio = outRate / inRate;
    var retio2 = inRate / outRate;
    var nyquistFreqRetio = message.data.nyquistFreqRetio;

    var from = message.data.from;
    var to = message.data.to;
    var inData = message.data.inData;
    var outData = new Array(to - from + 1);
    var nInSample = inData.length;
    var id = message.data.id;

    if (inRate > outRate) {
        for (var i = 0; i < 100; i++) {
            for (var outpos = Math.ceil((to - from + 1) * i / 100) + from; outpos < Math.ceil((to - from + 1) * (i + 1) / 100) + from; outpos++) {
                var inpos = outpos * retio2;
                if (inpos > nInSample - 1) {
                    inpos = nInSample - 1;
                    outData[outpos] = inData[inpos];
                }
                else {
                    var data = 0.0;
                    for (var n = 0; n < nInSample; n++) {
                        data += inData[n] * sinc((inpos - n) * retio * nyquistFreqRetio);
                    }
                    outData[outpos] = data * retio * nyquistFreqRetio;
                }
            }
            var sendData = {
                type: "progress",
                id: id,
                progress: i,
            }
            self.postMessage(sendData);
        }
    }
    else {
        for (var i = 0; i < 100; i++) {
            for (var outpos = Math.ceil((to - from + 1) * i / 100) + from; outpos < Math.ceil((to - from + 1) * (i + 1) / 100) + from; outpos++) {
                var inpos = outpos * retio2;
                if (inpos > nInSample - 1) {
                    inpos = nInSample - 1;
                    outData[outpos] = inData[inpos];
                }
                else {
                    var data = 0.0;
                    for (var n = 0; n < nInSample; n++) {
                        data += inData[n] * sinc((inpos - n) * nyquistFreqRetio);
                    }
                    outData[outpos] = data;
                }
            }
            var sendData = {
                type: "progress",
                id: id,
                progress: i,
            }
            self.postMessage(sendData);
        }
    }

    var sendData = {
        type: "outData",
        id: id,
        from: from,
        to: to,
        outData: outData,
    }
    self.postMessage(sendData);
    self.close();
});

function sinc(x) {
    if (x == 0) {
        return 1;
    }

    var _x = Math.PI * x;
    return Math.sin(_x) / _x;
}