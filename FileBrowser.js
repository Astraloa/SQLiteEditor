exports.FileBrowser = /** @class */(function () { // class FileBrowser

    /**
     * FileBrowser class
     * @param {string} file_path 
     */

    function FileBrowser(file_path) {
        this.path = file_path;
        this.file = java.io.File(this.path);
    }
    /**
     * next folder
     * @param {string} path 
     * @returns {boolean}
     */
    FileBrowser.prototype.next = function (path) {
        let next_path = this.path + '/' + path;
        this.file = java.io.File(next_path);
        if(!this.file.isDirectory()) {
            this.file = java.io.File(this.path);
            return false;
        }
        this.path = next_path;
        return true;
    }
    /**
     * prev folder
     */
    FileBrowser.prototype.prev = function () {
        let prev_path = this.path.split('/').slice(0, -1);
        if(prev_path.length <= 1) prev_path = prev_path.concat(['']);
        this.path = '/' + prev_path.join('/');
        this.file = java.io.File(this.path);
    }
    /**
     * folder + file list
     * @returns {array}
     */
    FileBrowser.prototype.list = function () {
        return this.file.list().map(str => str);
    }
    /**
     * create empty file
     * @param {string} file_name 
     * @returns {boolean}
     */
    FileBrowser.prototype.createEmptyFile = function(file_name) {
        let file_path = this.path + (this.path.endsWith('/') ? '' : '/') + file_name;
        return java.io.File(file_path).createNewFile();
    }

    return FileBrowser;
})();
