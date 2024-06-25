import java.util.* ;
import java.util.zip.* ;
import java.io.* ;

import org.apache.solr.client.solrj.SolrClient;
import org.apache.solr.client.solrj.SolrServerException;
import org.apache.solr.client.solrj.impl.HttpSolrClient;
import org.apache.solr.common.SolrInputDocument;

/*
17dec22 - load 1994 with openai ada-002 vectors dim 1536 - just one per article into modified solar 9.1
javac -classpath .:/home/kent/nlaOutput/solr/solr-9.1.0/server/solr-webapp/webapp/WEB-INF/lib/solr-solrj-9.1.0.jar LoadBgeBase768ToSolr.java

time java -classpath .:/home/kent/nlaOutput/solr/solr-9.1.0/server/lib/ext/*:/home/kent/nlaOutput/solr/solr-9.1.0/server/solr-webapp/webapp/WEB-INF/lib/*:/home/kent/nlaOutput/solr/solr-9.1.0/server/solr-webapp/webapp/WEB-INF/lib/solr-solrj-9.1.0.jar LoadBgeBase768ToSolr data/1994/openAIArticles-1536dim.txt "http://localhost:8983/solr/openAI1994Ada2" > data/logs/loadOpenAI1994Ada2-2
45494 recs loaded
real	3m12.797s
user	0m36.805s
sys	0m2.842s

12nov22 - load 1954
time java -classpath .:/home/kent/nlaOutput/solr/solr-9.0.0/server/lib/ext/*:/home/kent/nlaOutput/solr/solr-9.0.0/server/solr-webapp/webapp/WEB-INF/lib/*:/home/kent/nlaOutput/solr/solr-9.0.0/server/solr-webapp/webapp/WEB-INF/lib/solr-solrj-9.0.0.jar LoadBgeBase768ToSolr data/1954/outAllCanberra1954-768-with-smeared "http://localhost:8983/solr/CLIP1954Core" > data/logs/loadCLIP1954

real	128m38.368s
user	18m59.798s
sys	1m48.842s


3oct22 - add articleStemmed

javac -classpath .:/home/kent/wikidata/solr/solr-9.0.0/server/solr-webapp/webapp/WEB-INF/lib/solr-solrj-9.0.0.jar LoadBgeBase768ToSolr.java
time java -classpath .:/home/kent/wikidata/solr/solr-9.0.0/server/lib/ext/*:/home/kent/wikidata/solr/solr-9.0.0/server/solr-webapp/webapp/WEB-INF/lib/*:/home/kent/wikidata/solr/solr-9.0.0/server/solr-webapp/webapp/WEB-INF/lib/solr-solrj-9.0.0.jar LoadBgeBase768ToSolr > load768-log
real	1m22.658s
user	0m21.920s
sys	0m1.603s

java -classpath .:/home/kent/wikidata/solr/solr-9.0.0/server/lib/ext/*:/home/kent/wikidata/solr/solr-9.0.0/server/solr-webapp/webapp/WEB-INF/lib/*:/home/kent/wikidata/solr/solr-9.0.0/server/solr-webapp/webapp/WEB-INF/lib/solr-solrj-9.0.0.jar LoadBgeBase768ToSolr > load512-log

in germany: 
javac -classpath .:/home/kent/nlaOutput/solr/solr-9.0.0/server/solr-webapp/webapp/WEB-INF/lib/solr-solrj-9.0.0.jar LoadBgeBase768ToSolr.java
time java -classpath .:/home/kent/nlaOutput/solr/solr-9.0.0/server/lib/ext/*:/home/kent/nlaOutput/solr/solr-9.0.0/server/solr-webapp/webapp/WEB-INF/lib/*:/home/kent/nlaOutput/solr/solr-9.0.0/server/solr-webapp/webapp/WEB-INF/lib/solr-solrj-9.0.0.jar LoadBgeBase768ToSolr > loadSmeared-768.log

real	3m21.028s
user	0m41.316s
sys	0m2.316s

in germany: java -classpath .:/home/kent/nlaOutput/solr/solr-9.0.0/server/lib/ext/*:/home/kent/nlaOutput/solr/solr-9.0.0/server/solr-webapp/webapp/WEB-INF/lib/*:/home/kent/nlaOutput/solr/solr-9.0.0/server/solr-webapp/webapp/WEB-INF/lib/solr-solrj-9.0.0.jar LoadBgeBase768ToSolr > load512-log


http://localhost:8983/solr/testKnnCore/select?facet.field=org&facet=true
&indent=true&q.op=OR&q=person%3A%22Garfield%20Barwick%22&facet.field=person
&facet.field=location&facet.mincount=3&facet.limit=3&fl=id,issue,title,person.org.location,misc,article
core is /home/kent/wikidata/solr/solr-9.0.0/server/solr/testKnn768Core  (or testKnn512Core)


java -classpath .:/home/kent/wikidata/solr/solr-9.0.0/server/lib/ext/*:/home/kent/wikidata/solr/solr-9.0.0/server/solr-webapp/webapp/WEB-INF/lib/*:/home/kent/wikidata/solr/solr-9.0.0/server/solr-webapp/webapp/WEB-INF/lib/solr-solrj-9.0.0.jar LoadBgeBase768ToSolr "BERT-out-CanberraTimes1994" "http://localhost:7983/solr/testKnn768Core" > loadBERT-1-log


16oct23

javac -classpath .:/home/kent/nlaOutput/solr/solr-9.1.0/server/solr-webapp/webapp/WEB-INF/lib/solr-solrj-9.1.0.jar LoadBgeBase768ToSolr.java

java -classpath .:/home/kent/nlaOutput/solr/solr-9.1.0/server/lib/ext/*:/home/kent/nlaOutput/solr/solr-9.1.0/server/solr-webapp/webapp/WEB-INF/lib/*:/home/kent/nlaOutput/solr/solr-9.1.0/server/solr-webapp/webapp/WEB-INF/lib/solr-solrj-9.1.0.jar LoadBgeBase768ToSolr "../data/1994/bgeBase768-articlestxt.gz" "http://localhost:8983/solr/bgeBase768" > loadBgeBase768-1-log

HINTON

javac -classpath .:/home/kfitch/tools/solr-9.4.0/server/solr-webapp/webapp/WEB-INF/lib/solr-solrj-9.4.0.jar LoadBgeBase768ToSolr.java

java -classpath .:/home/kfitch/tools/solr-9.4.0/server/lib/ext/*:/home/kfitch/tools/solr-9.4.0/server/solr-webapp/webapp/WEB-INF/lib/*:/home/kfitch/tools/solr-9.4.0/server/solr-webapp/webapp/WEB-INF/lib/solr-solrj-9.4.0.jar LoadBgeBase768ToSolr data/CTArticles-bgeBase768-chunks.gz "http://localhost:8983/solr/bgeBase768"  "http://localhost:8983/solr/artchunks" > logs/loadBgeBase768-chunks

25nov23 - add chunks 

real	26m47.017s
user	9m9.338s
sys	0m18.969s
*/

public class LoadBgeBase768ToSolr {


  static String articleMetadata = null ;
  static StringBuffer article = new StringBuffer(1024*64) ;
  static HashSet<String> people = new HashSet<String>() ;
  static HashSet<String> locations = new HashSet<String>() ;
  static HashSet<String> orgs = new HashSet<String>() ;
  static HashSet<String> miscs = new HashSet<String>() ;
/*
  static HashSet<String> upperPeople = new HashSet<String>() ;
  static HashSet<String> upperLocations = new HashSet<String>() ;
  static HashSet<String> upperOrgs = new HashSet<String>() ;
  static HashSet<String> upperMiscs = new HashSet<String>() ;
  */

  static String weights[] ;
  static ArrayList<String> chunks  = new ArrayList<String>();

  static SolrClient client ;
  static SolrClient chunkClient ;
  static int ac = 0 ;

  static ArrayList<SolrInputDocument> batchDocs = new ArrayList<SolrInputDocument>(20000) ;
  static ArrayList<SolrInputDocument> batchChunkDocs = new ArrayList<SolrInputDocument>(20000) ;

  static int batchesAdded = 0 ; 
  public static void main(String args[]) throws Exception {

    File sourceData = new File(args[0]) ;
    String solrBase = args[1] ;
    String chunkSolrBase = args[2] ;

    BufferedReader br = new BufferedReader(new InputStreamReader(new GZIPInputStream(new FileInputStream(sourceData)))) ;


    System.out.println("LoadBgeBase768ToSolr sourceData: " + sourceData + ", mainSolrBase: " + solrBase +
      " chunkSolrBase " + chunkSolrBase) ;

    client = new HttpSolrClient.Builder(solrBase).build();  
    chunkClient = new HttpSolrClient.Builder(chunkSolrBase).build(); 
    //client = new HttpSolrClient.Builder("http://localhost:8983/solr/testKnn512Core").build(); // 512 vector
    while (true) {
//if (ac >= 1420) {
//  System.out.println("* * * * * Ending prematurely at article " + ac) ;
//  break ;
//}      
      String s = br.readLine() ;
      if (s == null) break ;
      if (s.startsWith("****ARTICLE id:")) {
        flushArticle(s) ;
        //if (ac >= 100000) break ;
      }
      else {
        if (s.startsWith(" ***article len ") && s.contains(" sampleCount ")) continue ; // junk..
        if (s.startsWith(" ***Entity ")) {
          s = s.substring(11) ;
          if (s.startsWith("DATE: ")) continue ; // ignore..
          if (s.startsWith("ORDINAL: ")) continue ; // ignore..
          if (s.startsWith("NUMBER: ")) continue ; // ignore..
          if (s.startsWith("DURATION: ")) continue ; // ignore..        
          if (s.startsWith("TIME: ")) continue ; // ignore..     
          if (s.startsWith("MONEY: ")) continue ; // ignore..            
          if (s.startsWith("SET: ")) continue ; // ignore..  
          if (s.startsWith("PERCENT: ")) continue ; // ignore..  

          s = s.toUpperCase() ;

          if (s.startsWith("PERSON: ")) {
            s = s.substring(8).trim() ;
            if (s.indexOf(' ') < 0) continue ; // ignore 1 person names for now

            if (s.equals("MEL BOURNE")) locations.add("MELBOURNE") ;
            else if (s.equals("SYD NEY")) locations.add("SYDNEY") ;
            else if (s.equals("- REUTER")) orgs.add("REUTERS") ;
            else if (s.equals("CANBERRA DEAKIN")) locations.add("DEAKIN") ;
            else if (s.equals("WAGGA WAGGA")) locations.add("WAGGA") ;
            else if (s.equals("NORTH KO REA")) locations.add("NORTH KOREA") ;
            else if (s.equals("TUGGERANONG VIKINGS")) orgs.add("TUGGERANONG VIKINGS") ;
            else if (s.equals("KATE CAR NELL")) people.add("KATE CARNELL") ;

            else people.add(s) ;
            continue ;
          }
          if (s.startsWith("ORGANIZATION: ")) {
            s = s.substring(14).trim() ;
            if (s.equals("NSW")) locations.add("NEW SOUTH WALES") ;
            else if (s.equals("UN")) orgs.add("UNITED NATIONS") ;
            else if (s.equals("BRISBANE") || s.equals("NEWCASTLE") || s.equals("CANTERBURY")
            || s.equals("WODEN") || s.equals("CANTERBURY") || s.equals("CAMPBELL") || s.equals("PENRITH")
            || s.equals("GOLD COAST") || s.equals("ILLAWARRA") || s.equals("GEELONG")
            || s.equals("ST KILDA") || s.equals("ESSENDON") || s.equals("PARRAMATTA")
            || s.equals("FOOTSCRAY") || s.equals("BALMAIN") || s.equals("CRONULLA")
            || s.equals("HAWTHORN") || s.equals("BARCELONA") || s.equals("PNG")
            || s.equals("RANDWICK") || s.equals("TURNER") || s.equals("PNG")
            || s.equals("HAWTHORN") || s.equals("BARCELONA") || s.equals("CANBERRA")
            || s.equals("WESTON CREEK") || s.equals("NOWRA") || s.equals("IPSWICH")
            || s.equals("MOSS VALE") || s.equals("KALEEN") || s.equals("ENGLAND")
            || s.equals("KINGSTON") || s.equals("COLLINGWOOD") || s.equals("QUEENSLAND")
            || s.equals("QUEANBEYAN") || s.equals("COVENTRY") || s.equals("CANBERRA")
            || s.equals("NORTHERN TERRITORY") || s.equals("FREMANTLE") || s.equals("VICTORIA")
            || s.equals("MANUKA")
              )  locations.add(s) ;
            else if (s.equals("ANU")) orgs.add("AUSTRALIAN NATIONAL UNIVERSITY") ;
            else if (s.equals("NRL")) orgs.add("NSW RUGBY LEAGUE") ;
            else if (s.equals("UNSW")) orgs.add("UNIVERSITY OF NSW") ;
            else if (s.equals("BRISBANE")) locations.add("BRISBANE") ;
            else orgs.add(s) ;
            continue ;
          }      
          if (s.startsWith("LOCATION: ")) {
            s = s.substring(10).trim() ;
            if (s.equals("US") || s.equals("USA") || s.equals("U.S.") || s.equals("UNITED STATES OF AMERICA") 
            || s.equals("U.S.A.")  || s.equals("U. S.") || s.equals("U.S.A")) locations.add("UNITED STATES") ;
            else if (s.equals("NZ")) locations.add("NEW ZEALAND") ;
            else if (s.equals("UK")) locations.add("UNITED KINGDOM") ;
            else if (s.equals("WAGGA WAGGA")) locations.add("WAGGA") ;
            else if (s.equals("SANTA CLAUS")) people.add("SANTA CLAUS") ;
            else if (s.equals("N. KOREA")) locations.add("NORTH KOREA") ;
            else if (s.equals("SOUTH AFRI")) locations.add("SOUTH AFRICA") ;
            else if (s.equals("SOUTH AF RICA")) locations.add("SOUTH AFRICA") ;
            else locations.add(s) ;
            continue ;
          }   
          if (s.startsWith("MISC: ")) {
            s = s.substring(6).trim() ;

            if (s.equals("AUS TRALIAN")) miscs.add("AUSTRALIAN") ;
            else if (s.equals("AUSTRA- LIANS")) miscs.add("AUSTRALIANS") ;
            else if (s.equals("AUS TRALIANS")) miscs.add("AUSTRALIANS") ;
            else if (s.equals("AUSTRA LIANS")) miscs.add("AUSTRALIANS") ;
            else if (s.equals("AUSTRAL IANS")) miscs.add("AUSTRALIANS") ;
            else if (s.equals("WESTERN AUS TRALIANS")) miscs.add("WESTERN AUSTRALIAN") ;
            else if (s.equals("WESTERN AUSTRA LIANS")) miscs.add("WESTERN AUSTRALIAN") ;
            else if (s.equals("COMMON WEALTH GAMES")) miscs.add("COMMONWEALTH GAMES") ;
            else if (s.equals("COM MONWEALTH GAMES")) miscs.add("COMMONWEALTH GAMES") ;
            else if (s.equals("MEL BOURNE CUP")) miscs.add("MELBOURNE CUP") ;
            else miscs.add(s) ;
            continue ;
          } 
          throw new Exception("Unrecog entity in " + articleMetadata + ": " + s) ;          
        }
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
        if (s.startsWith("***chunk ")) {
          chunks.add(s.substring(9)) ;
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
    if (!batchChunkDocs.isEmpty()) {
      chunkClient.add(batchChunkDocs) ;
      batchChunkDocs.clear() ;      
    }
    




    client.commit() ;
    chunkClient.commit() ;
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
      System.out.println("\nAdding id " + id + " issueDate " + issueDate + " title " + title + " cat " + category + " head " + headings +
        "\n text: " + article.toString() + 
        "\n weights: " + ((weights == null) ? "NONE" : ("" + weights[0] + ".." + weights[weights.length-1])) +
        "\n people: " + people +
        "\n orgs: " + orgs +
        "\n locations: " + locations +
        "\n miscs: " + miscs) ;

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


      if ((people.size() + orgs.size() + locations.size() + miscs.size()) < 100) { // dont add ents for just lists of names..
        for (String p: people)  doc.addField("person", p) ;
        for (String p: orgs)  doc.addField("org", p) ;
        for (String p: locations)  doc.addField("location", p) ;
        for (String p: miscs)  doc.addField("misc", p) ;
      }


      // chunks!
      if (!chunks.isEmpty()) {

        SolrInputDocument cdoc = new SolrInputDocument();
        cdoc.setField("id", "" + id) ;
        for (String c: chunks) {
          int k = c.indexOf(' ') ; // end of offset
          cdoc.addField("offset", Integer.parseInt(c.substring(0, k))) ;
          k++ ;
          byte cc[] = new byte[768/2] ;
          int ccOff = 0 ;
          for (int m=0;m<768;m=m+2) {
            byte b1 = (byte) c.charAt(k+m) ;
            if (b1 <= '9') b1 = (byte) (b1 - 48) ; // 0 - 9 -> 0..9
            else b1 = (byte) (b1 - 97 + 10) ;      // a - f -> 10..15
            byte b2 = (byte) c.charAt(k+m+1) ;
            if (b2 <= '9') b2 = (byte) (b2 - 48) ; // 0 - 9 -> 0..9
            else b2 = (byte) (b2 - 97 + 10) ;      // a - f -> 10..15
            cc[ccOff++] = (byte) (0x000000ff & (((b1 << 4) | b2))) ;
          //  System.out.println("Chars " + c.substring(k+m, k+m+2) + " bytes " + b1 + ", " + b2 +
            //    " combined as " + HexFormat.of().toHexDigits(cc[ccOff-1])) ;
          }
          cdoc.addField("encodedVector", cc) ;        

        }
        batchChunkDocs.add(cdoc) ;
      }

      if (true) {
        batchDocs.add(doc) ;
        if (batchDocs.size() >= 10000) {
          client.add(batchDocs);
          batchDocs.clear() ;
          batchesAdded++ ;

          if (!batchChunkDocs.isEmpty()) {
            chunkClient.add(batchChunkDocs) ;
            batchChunkDocs.clear() ;      
          }


          if ((batchesAdded % 10) == 0) {
            System.out.println("Commiting at cnt " + ac + " id " ) ;
            client.commit() ;
            chunkClient.commit() ;
          }
        }
      }
    }

    if (nextArticle != null) {
      articleMetadata = nextArticle ;
      article.setLength(0) ;
      weights = null ;
      people.clear() ;
      orgs.clear() ;
      locations.clear() ;
      miscs.clear() ;
      chunks.clear() ;
      /*
      upperPeople.clear();
      upperLocations.clear() ;
      upperOrgs.clear() ;
      upperMiscs.clear() ;
      */
      ac++ ;
    }
  }

  static String camelCase(String s) {

    char lastChar = ' ' ;
    StringBuffer t = new StringBuffer(64) ;
    for (int i=0;i<s.length();i++) {
      char c = s.charAt(i) ;
      if ((lastChar == ' ') && (Character.isLetter(c))) t.append(Character.toUpperCase(c)) ;
      else t.append(c) ;
      lastChar = c ; 
    }
    return t.toString() ;
  }

  public static void normalise(final float v[]) {

    double sums = 0 ;

    for (int i=0;i<v.length;i++) sums += v[i] * v[i] ;
    float scale = (float) (1 / Math.sqrt(sums) ) ;
    for (int i=0;i<v.length;i++) v[i] *= scale ;    
  }
}
