self.addEventListener("message", (message) => {
    var retio2 = message.data.inRate / message.data.outRate;

    var from = message.data.from;
    var to = message.data.to;
    var inData = message.data.inData;
    var outData = new Array(to - from + 1);
    var nInSample = inData.length;
    var id = message.data.id;

    for (var i = 0; i < 100; i++) {
        for (var outpos = Math.ceil((to - from + 1) * i / 100) + from; outpos < Math.ceil((to - from + 1) * (i + 1) / 100) + from; outpos++) {
            var inpos = outpos * retio2;
            if (inpos > nInSample - 1) {
                inpos = nInSample - 1;
                outData[outpos - from] = inData[inpos];
            }
            else {
                var pos0 = Math.floor(inpos);
                var pos1 = Math.ceil(inpos);
                if (pos0 == pos1) {
                    pos1++;
                }
                outData[outpos - from] = inData[pos0] + (inData[pos1] - inData[pos0]) * (inpos - pos0) / (pos1 - pos0);
            }
        }
        var sendData = {
            type: "progress",
            id: id,
            progress: i,
        }
        self.postMessage(sendData);
        self.close();
    }

    var sendData = {
        type: "outData",
        id: id,
        from: from,
        to: to,
        outData: outData,
    }
    self.postMessage(sendData);
});