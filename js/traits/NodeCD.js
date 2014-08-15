(function (window, $, d3, undefined) {
    var graph = window.setNamespace('app.graph'),
        app   = window.setNamespace('app'),
        NodeEvent = window.use('app.event.NodeEvent');

    /**
     * NodeEditor trait
     *
     * Adds functionality to create new nodes
     */
    graph.NodeCD = function () {

        // enforce use of new on constructor
        if ((this instanceof graph.NodeCD) === false) {
            return new graph.NodeCD(arguments);
        }
    };

    /**
     * Initializes variables and attaches events used for creating edges
     */
    graph.NodeCD.prototype.initialize = function () {

        var selectNode,
            unselectNode,
            updateNode;

        // action events
        selectNode   = window.curry(this.handleNodeSelect, this);
        unselectNode = window.curry(this.handleNodeUnselect, this);
        updateNode   = window.curry(this.handleNodeUpdate, this);

        $(this.kernel)
            .on(NodeEvent.SELECT, selectNode)
            .on(NodeEvent.UNSELECT, unselectNode)
            .on(NodeEvent.UPDATE, updateNode);
    };

    /**
     * Create a node from a given set of key value pairs
     */
    graph.NodeCD.prototype.createNode = function (data, x, y) {

        // then add node metadata
        this.graph.addNodeMetadata(data);

        data.x = x || 0;
        data.y = y || 0;

        // then let d3 add other properties
        // TODO do this after the trigger
        this.graph.nodes.push(data);
        this.graph.drawNodes();
        this.graph.force.start();

        $(this.kernel).trigger(NodeEvent.CREATED, [data]);

        return data;
    };

    graph.NodeCD.prototype.deleteEdgesForNode = function (nodeIndex) {

        var edges = this.graph.edges,
            edge;

        // start from top to remove multiple links correctly
        for (var i = edges.length-1; i >= 0; i--) {
            edge = edges[i];
            if (edge.source.index == nodeIndex || edge.target.index == nodeIndex) {
                edges.splice(i, 1);
            }
        }
    };

    /**
     * Handles the delete-node event
     */
    graph.NodeCD.prototype.destroyNode = function (data) {

        var graph = this.graph;
        this.deleteEdgesForNode(data.index);

        // remove the node at the index
        graph.nodes.splice(data.index, 1);

        // update the indices of all nodes behind it
        // yes? no?
        // for (var i = data.index; i < this.nodes.length; i++) {
        //  console.log(i + ' ' + this.nodes[i].index);
        //  this.nodes[i].index = i;
        // }

        // TODO move elsewhere
        graph.drawLinks();
        graph.redrawNodes();
        graph.force.start();

        $(this.kernel).trigger(NodeEvent.DESTROYED, [data]);
    };

    /**
     * Update the data and return the filtered updated data
     */
    graph.NodeCD.prototype.updateNodeDataWithFields = function (data) {

        var titleField = this.graph.getNodeTitleKey(),
            fields = $('#node-fields').children(),
            key,
            value,
            result = {};

        // clear the fields metadata, we'll refill this
        data._fields = [titleField];

        // set the title field separately
        data[titleField] = $('#node-title').val();
        result[titleField] = data[titleField];

        for (var i = 0; i < fields.length; i++) {
            key = $('.node-key', fields[i]).val();
            value = $('.node-value', fields[i]).val();

            // skip if the key is empty
            if (key == "" || value == "") {
                continue;
            }

            data._fields.push(key);
            data[key] = value;
            result[key] = value;
        }

        // TODO maybe we should try to remove the unused fields from the node data,
        // but this is not strictly necessary, the fields metadata works as a filter

        return result;
    };

    /**
     * Event Listeners
     */

    /**
     * Read the node into the edit form
     */
    graph.NodeCD.prototype.handleNodeSelect = function (event, node, data) {

        console.log('node select');

        var selectedNode = this.graph.selectedNode;

        if (selectedNode) {
            $(this.kernel).trigger(NodeEvent.UNSELECT, [selectedNode.node, selectedNode.data]);
        }

        // TODO fix this differently
        this.graph.selectedNode = {
            node: node,
            data: data
        };

        console.log("yo2");
        console.log(node);
        console.log(data);

        $(this.kernel).trigger(NodeEvent.SELECTED, [node, data]);
    };

    /**
     *
     */
    graph.NodeCD.prototype.handleNodeUnselect = function (event, node, data) {

        // if node and data are null, unselect all nodes
        var selectedNode = this.graph.selectedNode;

        console.log('handling unselecting node');

        if (data) {
            $(this.kernel).trigger(NodeEvent.UNSELECTED, [node, data]);
        } else if (selectedNode) {
            $(this.kernel).trigger(NodeEvent.UNSELECTED, [selectedNode.node, selectedNode.data]);
        }

        if (selectedNode) {
            console.log(selectedNode);

            this.graph.selectedNode = null;
        }
    };

    graph.NodeCD.prototype.handleCreateChildNode = function (event, node, data) {

        var self = this,
            newData = this.createNode({}, data.x, data.y);
            // newNode = d3.select('.node:nth-child(' + (newData.index+1) + ')', this.graph.selector);

        // passing newNode to trigger select doesn't work, because the nodes
        // are redrawn in the create edge trigger

        $(this.kernel)
            .trigger('create-edge', [data, newData])
            .trigger(NodeEvent.SELECT, [null, newData]);
        
    };

    graph.NodeCD.prototype.handleNodeCreate = function (event) {

        event.preventDefault();
        event.stopPropagation();

        var input = $('#new-node-name').val();
        if (input == '') {
            return;
        }

        $('#new-node-name').val('');

        this.createNode({name: input});
    };

    graph.NodeCD.prototype.handleNodeUpdate = function (event, node, data) {

        event.preventDefault();
        event.stopPropagation();

        if (!this.graph.selectedNode) {
            return;
        }

        var data,
            fieldName,
            titleField = this.graph.getNodeTitleKey(),
            nodeData = this.graph.selectedNode.data;      

        console.log("handling node update");

        if (!this.graph.selectedNode) {
            return;
        }

        data = this.updateNodeDataWithFields(nodeData);

        this.graph.redrawNodes();
        this.graph.force.start();

        if (!data[titleField] || data[titleField] == "") {
            return;
        }

        $(this.kernel).trigger(NodeEvent.UPDATED, [data, nodeData.id]);
    };

    graph.NodeCD.prototype.handleNodeDestroy = function (event, node, data) {

        var selectedNode = this.graph.selectedNode,
            nodeData;

        nodeData = data || (selectedNode && selectedNode.data);

        if (nodeData) {
            this.destroyNode(nodeData);
        }
    };

}(window, jQuery, d3));