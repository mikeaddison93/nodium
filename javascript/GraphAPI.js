(function (window, $, undefined) {
	var graph = window.setNamespace('app.graph');

	graph.API = function (g) {

		// enforce use of new on constructor
		if ((this instanceof graph.API) === false) {
			return new graph.API(arguments);
		}

		// the graph instance it should listen to
		this.graph = g;

		var createNode = window.curry(this.handleNodeCreated, this);
		$(g).on('node-created', createNode);
		var deleteNode = window.curry(this.handleNodeDeleted, this);
		$(g).on('node-deleted', deleteNode);
		var createEdge = window.curry(this.handleEdgeCreated, this);
		$(g).on('edge-created', createEdge);
		var deleteEdge = window.curry(this.handleEdgeDeleted, this);
		$(g).on('edge-deleted', deleteEdge);
	};

	graph.API.prototype.get = function (callback) {

		// OPTIONAL MATCH n-[r]-m
		var nodeQuery = {
		  "query" : "START n=node(*) RETURN n",
		  "params" : {}
		};

		$.post('http://localhost:7474/db/data/cypher', nodeQuery)
		 .done(function (nodeData) {

	 	var edgeQuery = {
		  "query" : "START r=relationship(*) RETURN r",
		  "params" : {}
		};

		$.post('http://localhost:7474/db/data/cypher', edgeQuery)
		 .done(function (edgeData) {

		 	// console.log(data);
		 	// parse the neo4j data
		 	var graph,
		 		nodes = [],
		 		edges = [],
		 		node, nodeId,
		 		edge,
		 		nodeMap = {},
		 		nodeCount = 0;

		 	if (!nodeData.data) {
		 		return;
		 	}

		 	// build the nodes array and the index map
		 	for (var i = 0; i < nodeData.data.length; i++) {
		 		node = nodeData.data[i][0];

		 		if (!node || nodeMap[node.self] !== undefined) {
		 			continue;
		 		}

		 		nodeMap[node.self] = nodeCount;
		 		nodeCount++;

		 		node.data['id'] = node.self;
		 		nodes.push(node.data);
		 	}

		 	// convert the edges to an array of d3 edges,
		 	// which have node indices as source and target
		 	console.log()
		 	for (var i = 0; i < edgeData.data.length; i++) {
		 		edge = edgeData.data[i][0];

		 		if (!edge) {
		 			continue;
		 		}

		 		edges.push({
		 			id: edge.self,
		 			source: nodeMap[edge.start],
		 			target: nodeMap[edge.end]
		 		});
		 	}

		 	// console.log(nodes);

		 	graph = {
		 		nodes: nodes,
		 		edges: edges
		 	};

		 	callback(graph);
		 });
		});
	};

	/**
	 * Create a node in the neo4j database
	 * Store the id to easily delete the node later
	 */
	graph.API.prototype.handleNodeCreated = function (event, data) {

		var props = {
			name: this.graph.getNodeText(data)
		};

		$.post('http://localhost:7474/db/data/node', props)
		 .done(function (newNode) {
		 	console.log(newNode);
		 	data['id'] = newNode.self;
		 });
	};

	/**
	 * We're doing this with a cypher, because we also have to delete
	 * all relationships
	 */
	graph.API.prototype.handleNodeDeleted = function (event, data) {

		console.log("deleting neo4j node");

		var nodeId,
			index,
			query;

		index = data.id.lastIndexOf('/');
		if (index == -1) {
			return;
		}

		nodeId = data.id.substring(index, data.id.length);
		console.log(nodeId); throw {};

		query = "START n=node("+nodeId+") MATCH n-[r?]-() DELETE n,r"

		$.post('http://localhost:7474/db/data/cypher', query)
		 .done(function (result) {
		 	console.log(result);
		});
	};

	graph.API.prototype.handleEdgeCreated = function (event, data, source, target) {

		console.log("creating neo4j edge");
		console.log(data);

		var props = {
			to: target.id,
			type: "POINTS"
		};

		$.post(source.id+'/relationships', props)
		 .done(function (result) {
		 	console.log(result);
		 	data['id'] = result.self;
		 });
	};

	graph.API.prototype.handleEdgeDeleted = function (event, data) {

		console.log("deleting neo4j edge");
		console.log(data.id);

		$.ajax({
			url: data.id,
			type: 'DELETE'
		})
		.done(function (result) {
		 	console.log(result);
		});
	};

	graph.API.prototype.handleNodeUpdated = function (event, data) {

		console.log("updating neo4j node");
		console.log(data.id);

		// copy the data and remove the id
		console.log(data);
		throw {};

		$.ajax({
			url: data.id + '/properties',
			type: 'PUT',
		})
		.done(function (result) {
		 	console.log(result);
		});
	};

	/*
	api.deleteNode = function (nodeObject) {
		$.ajax({
			url: window.location.href + 'graph/nodes/',
			contentType: 'application/json',
			type: 'DELETE',
			data: JSON.stringify(nodeObject)
		});
	};

	api.updateNode = function (nodeObject) {
		$.ajax({
			url: window.location.href + 'graph/nodes/',
			contentType: 'application/json',
			type: 'PUT',
			data: JSON.stringify(nodeObject)
		});
	};

	api.createEdge = function (linkObject, callback) {
		console.log(linkObject);
		$.ajax({
			url: window.location.href + 'graph/edges/',
			contentType: 'application/json',
			type: 'POST',
			data: JSON.stringify(linkObject),
			success: callback
		});
	};

	api.deleteEdges = function (linksArray, callback) {

		var data = [],
			i;

		for (i = 0; i < linksArray.length; i++) {
			data.push(linksArray[i].id);
		}

		$.ajax({
			url: window.location.href + 'graph/edges/',
			contentType: 'application/json',
			type: 'DELETE',
			data: JSON.stringify(data),
			success: callback
		});
	};
	*/

}(window, jQuery));