<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0"
                xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:output method="html" encoding="UTF-8" indent="yes"/>
  <xsl:template match="/">
    <html>
      <head><title>users</title></head>
      <body>
        <h1>Données : users</h1>
        <table border="1" cellpadding="5" cellspacing="0" style="border-collapse: collapse;">
          <tr>
            <th>id</th>
            <th>nom</th>
          </tr>
          <xsl:for-each select="users/record">
            <tr>
              <td><xsl:value-of select="id"/></td>
              <td><xsl:value-of select="nom"/></td>
            </tr>
          </xsl:for-each>
        </table>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>