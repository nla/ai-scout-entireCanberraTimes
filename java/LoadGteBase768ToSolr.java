import java.util.* ;
import java.util.zip.* ;
import java.io.* ;

import org.apache.solr.client.solrj.SolrClient;
import org.apache.solr.client.solrj.SolrServerException;
import org.apache.solr.client.solrj.impl.HttpSolrClient;
import org.apache.solr.common.SolrInputDocument;

/*
1may2024 - cloned from LoadBgeBase768ToSolr to load all CT to SOLR
2may Gte not so accurate, so try now with nomic ebeddings (otherwise identical - only the input file changes)

GTE:
javac -classpath .:/home/kfitch/tools/solr-9.4.0/server/solr-webapp/webapp/WEB-INF/lib/solr-solrj-9.4.0.jar LoadGteBase768ToSolr.java

java -classpath .:/home/kfitch/tools/solr-9.4.0/server/lib/ext/*:/home/kfitch/tools/solr-9.4.0/server/solr-webapp/webapp/WEB-INF/lib/*:/home/kfitch/tools/solr-9.4.0/server/solr-webapp/webapp/WEB-INF/lib/solr-solrj-9.4.0.jar LoadGteBase768ToSolr data/CT1926-169WithGTE.gz "http://localhost:8983/solr/entireCanberraTimes"   > logs/loadGteBase768-1926-1969

java -classpath .:/home/kfitch/tools/solr-9.4.0/server/lib/ext/*:/home/kfitch/tools/solr-9.4.0/server/solr-webapp/webapp/WEB-INF/lib/*:/home/kfitch/tools/solr-9.4.0/server/solr-webapp/webapp/WEB-INF/lib/solr-solrj-9.4.0.jar LoadGteBase768ToSolr data/CT1970-WithGTE.gz "http://localhost:8983/solr/entireCanberraTimes"   > logs/loadGteBase768-1970-94

nomic:

java -classpath .:/home/kfitch/tools/solr-9.4.0/server/lib/ext/*:/home/kfitch/tools/solr-9.4.0/server/solr-webapp/webapp/WEB-INF/lib/*:/home/kfitch/tools/solr-9.4.0/server/solr-webapp/webapp/WEB-INF/lib/solr-solrj-9.4.0.jar LoadGteBase768ToSolr data/CT1926-169WithNomic.gz "http://localhost:8983/solr/entireCanberraTimes"   > logs/loadNomic768-1926-1969

java -classpath .:/home/kfitch/tools/solr-9.4.0/server/lib/ext/*:/home/kfitch/tools/solr-9.4.0/server/solr-webapp/webapp/WEB-INF/lib/*:/home/kfitch/tools/solr-9.4.0/server/solr-webapp/webapp/WEB-INF/lib/solr-solrj-9.4.0.jar LoadGteBase768ToSolr data/CT1970-WithNomic.gz "http://localhost:8983/solr/entireCanberraTimes"   > logs/loadNomic768-1970-94


*/

public class LoadGteBase768ToSolr {

  static String articleMetadata = null ;
  static StringBuffer article = new StringBuffer(1024*64) ;

  static String weights[] ;

  static SolrClient client ;
  static int ac = 0 ;

  static ArrayList<SolrInputDocument> batchDocs = new ArrayList<SolrInputDocument>(20000) ;

  static int batchesAdded = 0 ; 
  public static void main(String args[]) throws Exception {

    File sourceData = new File(args[0]) ;
    String solrBase = args[1] ;

    BufferedReader br = new BufferedReader(new InputStreamReader(new GZIPInputStream(new FileInputStream(sourceData)))) ;

    System.out.println("LoadGteBase768ToSolr sourceData: " + sourceData + ", solrBase: " + solrBase) ;

    client = new HttpSolrClient.Builder(solrBase).build();  
    while (true) {
      /*if (ac >= 1420) {
        System.out.println("* * * * * Ending prematurely at article " + ac) ;
        break ;
      } */     
      String s = br.readLine() ;
      if (s == null) break ;
      if (s.startsWith("****ARTICLE id:")) {
        flushArticle(s) ;
        //if (ac >= 100000) break ;
      }
      else {
        if (s.startsWith(" ***article len ") && s.contains(" sampleCount ")) continue ; // junk..
        if (s.startsWith(" ***Entity ")) continue ; // junk..

        if (s.startsWith("***Vector")) {
          //System.out.println("GOT VECTOR " + s) ;
          s = s.substring(9) ;
          if (s.length() < 100) weights = null ; // assume none..
          else {
            weights = s.split(",") ;
            if (weights.length != 768) throw new Exception("Weight vector has wrong len in " + articleMetadata + ": " + weights.length) ; 
          }
          continue ;
        }     
        // else article text..
        article.append(s).append("\n") ;
      }
    }
    flushArticle(null) ;
    if (!batchDocs.isEmpty()) {
      client.add(batchDocs) ;
      batchesAdded++ ;
      batchDocs.clear() ;      
    }

    client.commit() ;
    System.out.println("Added " + ac + " articles in " + batchesAdded + " batches") ;
  }

  static void flushArticle(String nextArticle) throws Exception {

    if ((articleMetadata != null) && (article.length() >= 4)) {

      int i = articleMetadata.indexOf(" id:") ;
      long id = Long.parseLong(articleMetadata.substring(i + 4, articleMetadata.indexOf(", ", i + 4))) ;
      i = articleMetadata.indexOf(" issueDate:") ;
      String issueDate = articleMetadata.substring(i + 11, articleMetadata.indexOf(", ", i + 11)) ;
      // 148, issueDate:1970-01-01, category:Advertising, title: The Canberra Times (ACT : 1926 - 1995), head..

      int catStart = i + 32 ;
      i = articleMetadata.indexOf(", title:") ;
      String category = articleMetadata.substring(catStart, i).trim() ;

      int j = articleMetadata.indexOf(", heading:", i) ;
      String title = articleMetadata.substring(i+8, j).trim() ;
      String headings = articleMetadata.substring(j+10).replace(", subheadings:", "").trim() ;
      /*
      System.out.println("\nAdding id " + id + " issueDate " + issueDate + " title " + title + " cat " + category + " head " + headings +
        "\n text: " + article.toString() + 
        "\n weights: " + ((weights == null) ? "NONE" : ("" + weights[0] + ".." + weights[weights.length-1]))        
      ) ;
      */

      SolrInputDocument doc = new SolrInputDocument();
      doc.setField("id", "" + id);
      doc.setField("issue", "" + issueDate);
      doc.setField("year", "" + issueDate.substring(0, 4));
      doc.setField("title", title) ;
      doc.setField("category", category) ;
      doc.setField("heading", headings) ;
      doc.setField("headingStemmed", headings) ;

      doc.setField("article", article.toString()) ;
      doc.setField("articleStemmed", article.toString()) ;
      
      if (weights != null) {
        ArrayList<Float> floats = new ArrayList<Float>(weights.length) ;
        for (String t: weights) floats.add(Float.parseFloat(t)) ; // esnew Float(t)) ;
        doc.setField("vector", floats) ;
      }


      if (true) {
        batchDocs.add(doc) ;
        if (batchDocs.size() >= 10000) {
          client.add(batchDocs);
          batchDocs.clear() ;
          batchesAdded++ ;

          if ((batchesAdded % 10) == 0) {
            System.out.println("Commiting at cnt " + ac + " id " ) ;
            client.commit() ;
          }
        }
      }
    }

    if (nextArticle != null) {
      articleMetadata = nextArticle ;
      article.setLength(0) ;
      weights = null ;
      ac++ ;
    }
  }

}
