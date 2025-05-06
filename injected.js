(function (xhr) {
    var XHR = XMLHttpRequest.prototype;

    var open = XHR.open;
    var send = XHR.send;

    XHR.open = function (method, url) {
        this._method = method;
        this._url = url;
        return open.apply(this, arguments);
    };

    XHR.send = function (postData) {
        this._postData = postData;
        
        this.addEventListener('load', function () {
            window.postMessage({
                type: 'xhr',
                method: this._method,
                url: this._url,
                request: this._postData,
                response: this.response
            }, '*');
        });

        return send.apply(this, arguments);
    };
})(XMLHttpRequest);

const { fetch: origFetch } = window;
window.fetch = async (...args) => {
    const [url, options] = args;
    const method = options?.method || 'GET';
    const body = options?.body;

    const response = await origFetch(...args);

    response
        .clone()
        .text()
        .then(data => {
            window.postMessage({
                type: 'fetch',
                method: method,
                url: url,
                request: body,
                response: data
            }, '*');
        })
        .catch(err => console.error(err));

    return response;
};