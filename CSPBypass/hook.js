// from https://stackoverflow.com/a/70575665 & modified
// fix playlists bug
const OrigXHR = XMLHttpRequest;

XMLHttpRequest = function () {
    return new Proxy(new OrigXHR(), {
        open(method, url, async, username = null, password = null) {
            url = ConvertURL(url);
            arguments[1] = url;

            this.modMethod = method;
            this.modUrl = url;

            this.open(...arguments);
        },

        setRequestHeader(name, value) {
            if (!this.modReqHeaders) {
                this.modReqHeaders = {};
            }
            this.modReqHeaders[name] = value;
        },

        send(body = null) {
            if (!this.modReqHeaders) {
                this.modReqHeaders = {};
            }
            for (const [name, value] of Object.entries(this.modReqHeaders)) {
                this.setRequestHeader(name, value);
            }

            this.send(body);
        },

        get(xhr, key) {
            if (!key in xhr) return undefined;

            let value = xhr[key];
            if (typeof value === "function") {
                value = this[key] || value;
                return (...args) => value.apply(xhr, args);
            } else {
                return value;
            }
        },

        set(xhr, key, value) {
            if (key in xhr) {
                xhr[key] = value;
            }
            return value;
        }
    });
}

function ConvertURL(url) {
    if (!url.includes('api-v2.soundcloud.com/tracks?')) return url;
    if (!url.includes('_')) return url;
    const arr = url.split('?');
    if (arr.length < 2) return url;
    const defaultIds = arr[1].split('&').find(x => x.startsWith('ids='));
    let newIds = 'ids=';
    const ids = defaultIds.substr(4).split('%2C');
    for (let i = 0; i < ids.length; i++) {
        if (i != 0) newIds += '%2C';
        let id = ids[i];
        if (id.includes('_')) {
            id = id.split('_')[1];
        }
        newIds += id;
    }
    return url.replace(defaultIds, newIds);
}

console.log('XMLHttpRequest has been patched');