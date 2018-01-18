define([
    // basics
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/aspect',
    'dojo/dom-construct',
    'dojo/dom',
    'dojo/dom-attr',

    'dojo/on',

    // mixins & base classes
    'dijit/_WidgetBase',
    'dijit/_TemplatedMixin',
    'dijit/_WidgetsInTemplateMixin',

    // templates & widget css
    'dojo/text!./EmbeddedWaze/templates/EmbeddedWaze.html',
    'xstyle/css!./EmbeddedWaze/css/EmbeddedWaze.css',
    'dojo/i18n!./EmbeddedWaze/nls/resource',
    '//cdnjs.cloudflare.com/ajax/libs/proj4js/2.3.3/proj4.js',

    // not referenced
    'dijit/form/CheckBox'
], function (declare, lang, aspect, domConstruct, dom, domAttr,
    on, _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin,
    template, css, i18n, proj4) {

        return declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
            widgetsInTemplate: true,
            templateString: template,
            baseClass: 'gis_EmbeddedWaze',
            i18n: i18n,
            // in case this changes some day
            proj4BaseURL: 'http://spatialreference.org/',
            //  options are ESRI, EPSG and SR-ORG
            // See http://spatialreference.org/ for more information
            proj4Catalog: 'EPSG',

            postCreate: function () {
                this.inherited(arguments);

                if (this.parentWidget && this.parentWidget.toggleable) {
                    this.own(aspect.after(this.parentWidget, 'toggle', lang.hitch(this, function () {
                        this.setupConnections(this.parentWidget.open);
                    })));
                }

                window.Proj4js = proj4;
            },
            setupConnections: function (opened) {
                if (!opened) {
                    if (this._panEndHandler) {
                        this._panEndHandler.remove();
                        this._panEndHandler = null;
                    }

                    if (this._zoomEndHandler) {
                        this._zoomEndHandler.remove();
                        this._zoomEndHandler = null;
                    }

                    return;
                }

                if (!this._panEndHandler) {
                    this._panEndHandler = this.map.on('pan-end', lang.hitch(this, 'mapPanned'));
                }

                if (!this._zoomEndHandler) {
                    this._zoomEndHandler = this.map.on('zoom-end', lang.hitch(this, 'mapZoomed'));
                }

                this.reloadWazeMap(this.map);
            },
            getMapCenterWGS84: function (target) {
                var center = target.extent.getCenter();
                if (!center) {
                    return null;
                }

                // convert the map point's coordinate system into lat/long
                var geometry = null,
                    wkid = center.spatialReference.wkid;
                if (wkid === 102100) {
                    wkid = 3857;
                }
                var key = this.proj4Catalog + ':' + wkid;
                if (!proj4.defs[key]) {
                    var url = this.proj4BaseURL + 'ref/' + this.proj4Catalog.toLowerCase() + '/' + wkid + '/proj4js/';
                    require([url], lang.hitch(this, 'mapPanned', target, true));
                    return;
                }
                // only need one projection as we are
                // converting to WGS84 lat/long
                var projPoint = proj4(proj4.defs[key]).inverse([center.x, center.y]);
                if (projPoint) {
                    geometry = {
                        x: projPoint[0],
                        y: projPoint[1]
                    };

                    // console.log('convertendo, ficou...');
                    // console.dir(geometry);

                    return geometry;
                }

                return null;
            },
            toggleLockMap: function () {
                if (!this.chkLockMap.checked) {
                    this.reloadWazeMap(this.map);
                }
            },
            reloadWazeMap: function (centerFrom) {
                var mapLocked = this.chkLockMap.checked;

                if (mapLocked) {
                    return;
                }

                var center = this.getMapCenterWGS84(centerFrom);
                if (!center) {
                    return;
                }

                var newSource = `${this.wazeBaseUrl}zoom=${this.map.getLevel()}&lat=${center.y}&lon=${center.x}`;
                domAttr.set("wazeIFrame", "src", newSource);
            },
            mapZoomed: function () {
                // console.log('rolou o zoom: ');
                // console.dir(this.map.getLevel());

                this.reloadWazeMap(this.map);
            },
            mapPanned: function (evt) {
                // console.log('rolou o pan: ');
                // console.dir(evt.extent.getCenter());

                this.reloadWazeMap(evt);
            }
        });
    });
