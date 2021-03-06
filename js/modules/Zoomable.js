(function (window, $, d3, undefined) {

'use strict';

var modules   = window.setNamespace('app.modules'),
    app       = window.use('app'),
    _defaults;

/**
 * Zoomable module
 *
 * Adds standard d3 zooming and panning functionality to the graph
 */
modules.Zoomable = app.createClass({

    construct: function (options) {

        this.options = $.extend({}, _defaults, options);
    },

    initialize: function () {

        var zoomHandler = window.curry(this.handleZoom, this);
        var zoomStartHandler = window.curry(this.handleZoomStart, this);
        var zoomEndHandler = window.curry(this.handleZoomEnd, this);
        d3.select(this.graph.selector + ' .graph-viewport')
          .call(d3.behavior.zoom()
            .on('zoom', zoomHandler)
            .on('zoomstart', zoomStartHandler)
            .on('zoomend', zoomEndHandler)
          )

        // disables zoom on double click
        if (!this.options.doubleclick) {
            d3.select(this.graph.selector + ' .graph-viewport')
                .on('dblclick.zoom', null);
        }

        this.elem = $('.graph-content', this.graph.selector).get(0);
    },

    handleZoom: function () {

        var position = d3.mouse(this.elem),
            xdiff = this.dragStartPosition[0] - position[0],
            ydiff = this.dragStartPosition[1] - position[1];

        if (xdiff != 0 || ydiff != 0) {
            this.graph.dragging = true;
        }

        var prototype = 'translate(__translate__) scale(__scale__)',
            transform = prototype
                .replace(/__translate__/g, d3.event.translate)
                .replace(/__scale__/g, d3.event.scale);

        d3.select(this.graph.selector).select('.graph-content').attr('transform', transform);
    },

    handleZoomStart: function () {

        this.dragStartPosition = d3.mouse(this.elem);
    },

    handleZoomEnd: function () {

        this.graph.dragging = false;
    }
});

}(window, window.jQuery, window.d3));