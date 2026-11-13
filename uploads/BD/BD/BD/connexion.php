<?php 
	      define('dsn','mysql:host=localhost;dbname=mon_test');
        define('utilisateur','root');
        define('mdp','');
        //try{
            //$connDB=new PDO(DB_DSN,DB_USER,DB_PASS);
        //$dsn = "mysql:host='localhost';dbname='ecole'";
        //$utilisateur = 'root';
        //$mdp = '';
          // création d'un objet PDO et connexion
          
        try {
               $connDB = new PDO(dsn, utilisateur, mdp);  
            } catch (Exception $erreur) {
                echo "Erreur : ".$erreur->getMessage(); 
                exit();
              }
?>