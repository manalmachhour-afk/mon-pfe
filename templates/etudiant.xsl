<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0"
                xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:output method="html" encoding="UTF-8" indent="yes"/>
  <xsl:template match="/">
    <html>
      <head><title>etudiant</title></head>
      <body>
        <h1>Données : etudiant</h1>
        <table border="1" cellpadding="5" cellspacing="0" style="border-collapse: collapse;">
          <tr>
            <th>cne</th>
            <th>nom</th>
            <th>prenom</th>
            <th>adress</th>
          </tr>
          <xsl:for-each select="etudiant/record">
            <tr>
              <td><xsl:value-of select="cne"/></td>
              <td><xsl:value-of select="nom"/></td>
              <td><xsl:value-of select="prenom"/></td>
              <td><xsl:value-of select="adress"/></td>
            </tr>
          </xsl:for-each>
        </table>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>