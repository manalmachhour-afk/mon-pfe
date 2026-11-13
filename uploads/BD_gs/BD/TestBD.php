<html>
    <head>
    <title> Affichage </title>
    </head>
    <body>
        <?php 
	       include('connexion.php');
            $requete = "SELECT * FROM etudiant";
            $resultat = $connDB->query($requete);
            $donnees = $resultat->fetchAll(); 
            foreach($donnees as $ligne) {
                echo $ligne['cne']." ".$ligne['nom']." ".$ligne['prenom']." ".$ligne['adresse']."<br>";
            }
            ///////////////////////////////////////////////////////////////////////
            // extraction de données avec fetch()
            /*include("connexion.php");
            $requete = "SELECT * FROM etudiant";
            $resultat = $connDB->query($requete); 
            while ($ligne = $resultat->fetch()) {
                echo $ligne['cne']." ".$ligne['nom']." ".$ligne['prenom']." ".$ligne['adresse']."<br>";
            }
*/
            if ($connDB) {
                $connDB = NULL;
                }
        ?>
    </body>
</html>    