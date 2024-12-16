module.exports = class Version {
    constructor(version) {
        if (typeof (version) != 'string') {
            throw ("Version can't be a non-string object");
        }

        const parse = version.split('.');

        if (parse.length < 1) {
            throw ("Version-string argument can't be less than 1 characters");
        }

        this.major = -1;
        this.minor = -1;
        this.build = -1;
        this.revision = -1;

        for (let i = 0; i < parse.length && i < 4; i++) {
            const element = parseInt(parse[i]);

            if (isNaN(element) || element < 0) {
                i--;
                continue;
            }

            switch (i) {
                case 0:
                    this.major = element;
                    break;
                case 1:
                    this.minor = element;
                    break;
                case 2:
                    this.build = element;
                    break;
                case 3:
                    this.revision = element;
                    break;
                default:
                    break;
            }

        }
    }

    isBiggest(compare) {
        if (compare.major === -1) {
            return false;
        }
        if (this.major > compare.major) {
            return true;
        }
        if (this.major < compare.major) {
            return false;
        }

        if (compare.minor === -1) {
            return false;
        }
        if (this.minor > compare.minor) {
            return true;
        }
        if (this.minor < compare.minor) {
            return false;
        }

        if (compare.build === -1) {
            return false;
        }
        if (this.build > compare.build) {
            return true;
        }
        if (this.build < compare.build) {
            return false;
        }

        if (compare.revision === -1) {
            return false;
        }
        if (this.revision > compare.revision) {
            return true;
        }
        if (this.revision < compare.revision) {
            return false;
        }

        return false;
    }

    toString() {
        let ret = '';

        if (this.major >= 0) {
            ret += this.major;

            if (this.minor >= 0) {
                ret += '.';
                ret += this.minor;

                if (this.build >= 0) {
                    ret += '.';
                    ret += this.build;

                    if (this.revision >= 0) {
                        ret += '.';
                        ret += this.revision;
                    }
                }
            }
        }

        return ret;
    }
}