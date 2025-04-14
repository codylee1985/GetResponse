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
        this.addEventListener('load', function () {
            window.postMessage({ type: this._method, url: this._url, data: this.response }, '*');
        });
        return send.apply(this, arguments);
    };
})(XMLHttpRequest);



const { fetch: origFetch } = window;
window.fetch = async (...args) => {
    const response = await origFetch(...args);
    response
        .clone()
        .blob()
        .then(data => {
            window.postMessage({ type: 'fetch', data: data }, '*');
        })
        .catch(err => console.error(err));
    return response;
};