const solr = require('solr-client') ;
const log = require('log4js').getLogger('solr') ;

let solrClientConfig = null ;
let docCoreUrl = null ;
let chunkCoreUrl = null ;
/*
function solrDelete(solrClient, field, query) {
	
	return new Promise(function (resolve, reject) {
		solrClient.delete(field, query, function(err, result) {
			if (err) {
				log.error("solrDelete field: " + field + " query: " + query + " error: " + JSON.stringify(err)) ;
				reject(err) ;
			}
			else {
				log.debug("solrDelete field: " + field + " query: " + query + " result: " + JSON.stringify(result)) ;
				resolve(result) ;
			}
		}) ;
	}) ;
}

function solrDeleteByQuery(solrClient, query) {
	
	return new Promise(function (resolve, reject) {
		solrClient.deleteByQuery(query, function(err, result) {
			if (err) {
				log.error("solrDelete query: " + query + " error: " + JSON.stringify(err)) ;
				reject(err) ;
			}
			else {
				log.debug("solrDelete  query: " + query + " result: " + JSON.stringify(result)) ;
				resolve(result) ;
			}
		}) ;
	}) ;
}

function solrAdd(solrClient, docs) {
	   
	//log.debug("ADDING DOC 0=" + JSON.stringify(docs[0])) ;
	return new Promise(function (resolve, reject) {
		solrClient.add(docs, function (err, result) {
			if (err) {
				//log.error("solrAdd docs: " + JSON.stringify(docs) + " error: " + JSON.stringify(err)) ;
				reject(err) ;
			}
			else {
				//log.debug("solrAdd field: " + JSON.stringify(docs) + " result: " + JSON.stringify(result)) ;
				resolve(result) ;
			}
		}) ;
	}) ;
}

function solrCommit(solrClient) {
	   
	return new Promise(function (resolve, reject) {
		solrClient.commit(function (err, result) {
			if (err) {
				log.error("solrCommit error: " + JSON.stringify(err)) ;
				reject(err) ;
			}
			else {
				log.debug("solrCommit result: " + JSON.stringify(result)) ;
				resolve(result) ;
			}
		}) ;
	}) ;
}

function solrRollback(solrClient) {
	   
	return new Promise(function (resolve, reject) {
		solrClient.rollback(function (err, result) {
			if (err) {
				log.error("solrRollback error: " + JSON.stringify(err)) ;
				reject(err) ;
			}
			else {
				log.debug("solrRollback result: " + JSON.stringify(result)) ;
				resolve(result) ;
			}
		}) ;
	}) ;
}

*/

function solrSearch(solrClient, query) {
	   
	return new Promise(function (resolve, reject) {
		log.debug(" solr query: " + JSON.stringify(query)) ;
		solrClient.search(query, function (err, result) {
			if (err) {
				log.error("solrSearch error: " + JSON.stringify(err)) ;
				reject(err) ;
			}
			else {
				//log.debug("solrSearch result: " + JSON.stringify(result)) ;
				resolve(result) ;
			}
		}) ;
	}) ;
}

module.exports = {

	init: function() {

        solrClientConfig = {
            host: process.env.SOLR_HOST || '127.0.0.1',
            port: process.env.SOLR_PORT || 8983,
            docCore: process.env.SOLR_DOC_CORE || 'dunno', 	
						chunkCore: process.env.SOLR_CHUNK_CORE || 'dunno', 	
            path: process.env.SOLR_PATH || '/solr'  
        } ;
        
        docCoreUrl = "http://" + solrClientConfig.host + ":" + solrClientConfig.port +
                solrClientConfig.path + "/" + solrClientConfig.docCore ;
				chunkCoreUrl = "http://" + solrClientConfig.host + ":" + solrClientConfig.port +
                solrClientConfig.path + "/" + solrClientConfig.chunkCore ;								
                
        log.info("SOLR configuration: docs:" + docCoreUrl + " chunks: " + chunkCoreUrl) ;        
	},

	getDocCoreUrl: function() {
		
		return docCoreUrl ;
	},	
	getChunkCoreUrl: function() {
		
		return chunkCoreUrl ;
	},		
/*	
	deleteDocumentById: async function(id) {		
		
		//if (!id.match(/^[0-9]{1,4}$/)) throw new Error("id invalid for delete:" + id) ;		
		log.info("Deleting solr document id: " + id) ;
		
		try {
			const solrClient = solr.createClient(solrClientConfig) ;
			await solrDelete(solrClient, "id", id) ;
			return await solrCommit(solrClient) ;
		}
		catch(err) {
			log.error("Error deleting solr id: " + id + " err: " + err) ;
			throw err ;
		}
	},

	deleteDocumentByQuery: async function(query) {		
		
		log.info("Deleting solr by query: " + query) ;
		
		try {
			const solrClient = solr.createClient(solrClientConfig) ;
			await solrDeleteByQuery(solrClient, query) ;
			return await solrCommit(solrClient) ;			
		}
		catch(err) {
			log.error("Error deleting by query: " + query + " err: " + err) ;
			throw err ;
		}
	},
	
	addOrReplaceDocuments: async function(docs) {
		
		log.info("Adding " + docs.length + " solr documents") ;
		try {
			const solrClient = solr.createClient(solrClientConfig) ;
			await solrAdd(solrClient, docs) ;
			return await solrCommit(solrClient) ;	
		}
		catch(err) {
			log.error("Error addOrReplaceDocuments: " + err) ;
			throw err ;
		}		
	},
*/	
	getSolrClient: function() {
		
		return solr.createClient(solrClientConfig) ;
	},
	
	search: async function(solrClient, query) {

		log.info("Querying " + JSON.stringify(query)) ;
		try {
			return await solrSearch(solrClient, query) ;
		}
		catch(err) {
			log.error("Error solr search: " + err) ;
			throw err ;
		}		
	}
} ;