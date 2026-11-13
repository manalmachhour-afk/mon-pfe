<?php 
$dn='mysql:host=localhost;dbname=mon_test;charset=utf8';
$uts='root';
$d='md';

try {
    $connDB = new PDO($dn, $uts, $md);
   
} catch (PDOException $erreur) {
    echo "Erreur : " . $erreur->getMessage();
    exit();
}
?>
