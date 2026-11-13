<html>
    <head>
    <title> insertion </title>
    </head>
    <body>
        <form  action="insertion.php" method="POST">
            cne: <input type="text" name="cne"><br>
            nom: <input type="text" name="nom"><br>
            prenom: <input type="text" name="prenom"><br>
            adresse: <input type="text" name="adresse"><br>
            <input type="submit" value="insérer"/>
        </form>
        <?php
            include ('connexion.php');
            $requete='INSERT INTO etudiant(cne,nom,prenom,adresse) VALUES (:cne,:nom,:prenom,:adresse)';
            $modele=$connDB->prepare($requete);
            $modele->bindValue(':cne',$_POST['cne']);
            $modele->bindValue(':nom',$_POST['nom']);
            $modele->bindValue(':prenom',$_POST['prenom']);
            $modele->bindValue(':adresse',$_POST['adresse']);
            
            $rep=$modele->execute();
            if(!($rep)){
                echo "probleme d\'insertion ";
            }
            else{
                echo "insertion reussi";
            }
            if ($connDB) {
                $connDB = NULL;
                }
            header("location:TestBD.php");
            
        ?>
</body>
</html>

