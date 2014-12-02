(function (window, $, _, undefined) {

'use strict';

var ui          = window.setNamespace('app.ui'),
    app         = window.use('app'),
    Event       = window.use('app.event.Event'),
    EdgeEvent   = window.use('app.event.EdgeEvent'),
    NodeEvent   = window.use('app.event.NodeEvent'),
    model       = window.use('app.model'),
    Node        = window.use('app.model.Node'),
    List        = window.use('app.ui.List'),
    _defaults;

ui.NodeEditPanel = app.createClass(ui.UIPanel, {

    construct: function (selector, options, kernel) {

        this.initialize(selector, kernel);

        this.options = $.extend({}, _defaults, options);
        this.name = 'Node Editor';
        this.icon = 'icon-pencil';

        // TODO put list item empty data somewhere else?
        this.propertyList = new List('#node-fields', '#node-form', {
            new:    '#new-property', // new handle
            delete: '.delete-property', // delete handle
            empty:  { field: '', value: '', rows:  1 } // empty prototype data
        });

        this.labelList = new List('#node-labels', '#node-form', {
            new:    '#new-label', // new handle
            delete: '.delete-label', // delete handle
            empty:  { label: '' } // empty prototype data
        });

        this.edgeList = new List('#node-edges', '#node-form', {
            delete: '.delete-edge'
        });

        // mapping of node fields to ui field id
        // generalize this with options
        this.exceptions = {
            'node-title': 'name'
        };

        /*
         * Typeahead using bloodhound
         * Initialization is done when the graph is loaded
         */
        this.bloodhound = new Bloodhound({
            name: 'edges',
            local: this.getTypeaheadNodes.bind(this),
            datumTokenizer: function (node) {
                return Bloodhound.tokenizers.whitespace(
                    Node.getPropertyValue(node, 'name')
                );
            },
            queryTokenizer: Bloodhound.tokenizers.whitespace
        });

        $('#new-edge').typeahead(null, {
            source:     this.bloodhound.ttAdapter(),
            displayKey: function (node) {
                return Node.getPropertyValue(node, 'name');
            }
        });
    },

    init: function (container) {

        $(container).on('menu-collapse', this.handleMenuCollapse.bind(this));
        // $(this.kernel).on(NodeEvent.SELECTED, nodeSelectedHandler);
        this.kernel
            .on(this, NodeEvent.SELECTED)
            .on(this, NodeEvent.UNSELECTED)
            .on(this, NodeEvent.UPDATED);
        // $(this.kernel).on(NodeEvent.UNSELECTED, nodeUnselectedHandler);

        $(this.kernel).on(NodeEvent.LOADED, this.handleGraphLoaded.bind(this));

        this
            .on(this, '#node-form', Event.FOCUS_OUT, 'textarea')
            .on(this, '#node-form', Event.FOCUS_OUT, 'input');

        $(this.labelList).on('list-delete', this.handleDeleteElement.bind(this, 'label'));
        $(this.propertyList).on('list-delete', this.handleDeleteElement.bind(this, 'property'));
        $(this.edgeList).on('list-delete', this.handleDeleteEdge.bind(this));
        $('#new-edge').on(Event.SUBMIT, function (e) { e.preventDefault; e.stopPropagation(); });
        $('#new-edge').on('typeahead:selected', this.handleCreateEdge.bind(this));

        $('#delete-node-button', this.view).on(Event.CLICK, this.handleDeleteNodeButtonClick.bind(this));

        return this;
    },

    getTypeaheadNodes: function () {

        // filter all nodes
        if (this.nodes) {
            return this.nodes.filter(function (node) {
                return Node.hasProperty(node, 'name');
            });
        } else {
            return [];
        }
    },

    show: function () {

        var titleField = $('#node-title', this.view);

        this.super('show');

        // delay setting focus to titleField to prevent breaking the layout
        window.setTimeout(function () {
            titleField.focus();
        }, 200);
        $(this.kernel).trigger('mode-change', 'select');
    },

    unset: function (data, type) {

        console.log('unsetting data: ' + type);
        var update = new model.Update();

        if (type === 'label') {
            // data is the value
            update.unsetLabel(data);
        } else if (type === 'property') {
            // data is the property name
            update.unsetProperty(data);
        } else if (type === 'edge') {
            // ???
        }

        $(this.kernel).trigger(NodeEvent.UPDATE, [null, this.nodeData, update]);
    },

    /**
     * Create an object that can be given to the list renderer
     */
    parseLabel: function (value) {

        return {
            label: value
        };
    },

    /**
     * Create an object that can be given to the list renderer
     */
    parseProperty: function (value, key) {

        return {
            field: key,
            value: value,
            rows: 1
        };
    },

    parseEdge: function (edge) {

        var id = Node.getId(this.nodeData),
            name,
            source = edge.source,
            target = edge.target;

        if (Node.getId(source) !== id) {
            name = Node.getPropertyValue(source, 'name');
        } else {
            name = Node.getPropertyValue(target, 'name');
        }

        return {
            name: name || ''
        };
    },

    /**
     * Gets the labels from the html fields
     */
    getLabels: function () {

        var data = this.labelList.get();

        return _.chain(data)
            .map(_.first) // every item has one element
            .pluck('value')
            .filter(function (value) {return value !== '';})
            .valueOf();
    },

    /**
     * Gets the properties from the html fields
     */
    getProperties: function () {

        var data = this.propertyList.get(),
            key,
            value,
            properties;

        // handle the special fields
        properties = _.chain(this.exceptions)
            .invert() // put property names as keys
            .mapValues(function (selector) { return $('#' + selector).val() })
            .pick(_.identity) // filter where value is empty
            .valueOf();

        // handle the regular property fields
        _.forEach(data, function (row) {
            key = row[0].value;
            value = row[1].value;
            if (key != '' && value != '') {
                properties[key] = value;
            }
        });

        return properties;
    },

    updateLabels: function (label) {

        var labels,
            update = new model.Update();

        // we don't have an object to update
        if (!this.nodeData) {
            return;
        }
        
        // update.setLabel(label);
        // console.log(update);
        labels = this.getLabels();
        update.setLabels(labels);

        $(this.kernel).trigger(NodeEvent.UPDATE, [null, this.nodeData, update]);
    },

    updateProperties: function () {

        var properties,
            update = new model.Update();

        // we don't have an object to update
        if (!this.nodeData) {
            return;
        }

        properties = this.getProperties();
        update.setProperties(properties);

        $(this.kernel).trigger(NodeEvent.UPDATE, [null, this.nodeData, update]);
    },

    setData: function (data) {

        var propertyData,
            labelData,
            edgeData;

        this.nodeData  = data || {};
        this.nodeEdges = Node.filterEdges(data, this.edges);

        // set the fields that aren't in a list
        _.forOwn(this.exceptions, function (property, selector) {
            var value = Node.getPropertyValue(data, property) || '';
            $('#'+selector, this.view).val(value);
        }, this);

        propertyData = _.map(data._properties, this.parseProperty)
                        .filter(function (element) {
                            return !_.contains(_.values(this.exceptions), element.field);
                        }, this);
        labelData    = _.map(data._labels, this.parseLabel);
        edgeData     = _.map(this.nodeEdges, this.parseEdge, this);

        this.propertyList.set(propertyData);
        this.labelList.set(labelData);
        this.edgeList.set(edgeData);
    },

    unsetData: function (data) {

        // clear the values that are not in a list
        _.forOwn(this.exceptions, function (property, selector) {
            $('#'+selector, this.view).val('');
        }, this);

        $('#new-edge').val('');

        this.propertyList.clear();
        this.labelList.clear();
        this.edgeList.clear();

        this.nodeData = null;
        this.nodeEdges = null;
    },


    /**
     * Event handlers
     */

    handleCreateEdge: function (event, node) {

        $(this.kernel).trigger(EdgeEvent.CREATE, [this.nodeData, node]);
    },

    handleDeleteEdge: function (event, data) {

        
    },

    handleDeleteElement: function (type, event, data) {

        var key = data[0].value;

        if (key) {
            this.unset(key, type);
        }
    },

    handleDeleteNodeButtonClick: function (event) {

        event.preventDefault();
        event.stopPropagation();

        $(this.kernel).trigger(NodeEvent.DESTROY, [null, this.nodeData]);
    },

    handleFocusout: function (event) {

        // check if we're updating property or label
        if ($(event.currentTarget).hasClass('node-label-value')) {
            var label = $(event.currentTarget).val();
            this.updateLabels(label);
        } else {
            this.updateProperties();
        }
    },

    /**
     * We have to know about the nodes in the graph for use in the typeahead
     */
    handleGraphLoaded: function (event, nodes, edges) {

        this.nodes = nodes;
        this.edges = edges;
        this.bloodhound.initialize();
    },

    handleNewEdgeSubmit: function (event) {

        var value = $('#new-edge').val();

        if (value && value !== '') {
            this.edgeList.add({
                name: value
            });

            // update the node's edge data
        }
    },

    handleNodeSelected: function (event, node, data) {

        this.setData(data);
        this.view.trigger('panel-show', [this]);
    },

    handleNodeUnselected: function (event, node, data) {

        this.unsetData();
        this.view.trigger('panel-hide', [this]);
    },

    handleNodeUpdated: function (event, node, data, update) {

        if (this.isVisible && this.nodeData.index === data.index) {
            this.setData(data);
        }
    }
});

}(window, window.jQuery, window._));