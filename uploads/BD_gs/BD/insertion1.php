<html>
    <head>
    <title> insertion </title>
    </head>
    <body>
        <form  action="insertion1.php" method="POST">
            cne: <input type="text" name="cne">
            nom: <input type="text" name="nom">
            prenom: <input type="text" name="prenom">
            adresse: <input type="text" name="adresse">
            <input type="submit" value="insérer"/>
        </form>
       <?php
            include('connexion.php');
            $cne=$_POST['cne'];
            $nom=$_POST['nom'];
            $prenom=$_POST['prenom'];
            $adresse=$_POST['adresse'];
                
                
            if(isset($nom) && isset($prenom) && isset($adresse) && isset($cne)){
            $requete='INSERT INTO Etudiant(cne,nom,prenom,adresse) VALUES (?,?,?,?)';
            $modele=$connDB->prepare($requete);
            $param=array($cne,$nom,$prenom,$adresse);
            $rep=$modele->execute($param);
            }
            header("location:TestBD.php");
          
        ?>
</body>
</html>

