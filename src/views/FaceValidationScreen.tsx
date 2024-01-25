import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, ActivityIndicator, ImageBackground } from 'react-native';
import { Camera, CameraType } from 'expo-camera';
import { Svg, Circle } from 'react-native-svg';
import * as facemesh from '@tensorflow-models/facemesh';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ExpoImageManipulator from 'expo-image-manipulator';
import * as tf from '@tensorflow/tfjs';
import * as FileSystem from 'expo-file-system';
import { decodeJpeg } from '@tensorflow/tfjs-react-native';

export function FaceValidationScreen() {
  const [type, setType] = useState(CameraType.front);
  const [permission, requestPermission] = Camera.useCameraPermissions();


  function toggleCameraType() {
    setType(current => (current === CameraType.back ? CameraType.front : CameraType.back))
  }

  const [cameraRef, setCameraRef] = useState(null);
  const [listPredictions, setListPredictions] = useState([]);
  const [picturePath, setPicturePath] = useState(null);
  const [loadingPicture, setLoadingPicture] =  useState(0);
  const [successResgister, setSuccessRegister] = useState(0);

  const detectFace = async () => {
    setLoadingPicture(1);
    if (cameraRef) {
      const { uri } = await cameraRef.takePictureAsync({ quality: 0.5 });

      await resizeImage(uri);
    }
  };

  const resizeImage = async (selectedImage) => {
    if (selectedImage) {
      const resizedImage = await ExpoImageManipulator.manipulateAsync(
        selectedImage,
        [{ resize: { width: 252, height: 252 } }],
        { compress: 1, format: ExpoImageManipulator.SaveFormat.JPEG }
      );
      setPicturePath(resizedImage.uri);
      await handleCreateCartoon(resizedImage.uri);
    }
  };

  const handleCreateCartoon = async (resizedImage) => {
    setListPredictions([]);
    setSuccessRegister(0);
    await tf.ready();
    const model = await facemesh.load({
      maxFaces: 1
    });

    const imageBase64 = await FileSystem.readAsStringAsync(resizedImage, {
      encoding: FileSystem.EncodingType.Base64
    })
    
    const imgBuffer = tf.util.encodeString(imageBase64, 'base64').buffer;
    const raw = new Uint8Array(imgBuffer);
    const imageTensor = decodeJpeg(raw);
    const predictions = await model.estimateFaces(imageTensor);

    setListPredictions(predictions);
    await checkFaceMatch(predictions[0].scaledMesh);
    setLoadingPicture(0);
  };

  const checkFaceMatch = async (currentFace) => {
    const key = 'registeredFaces';
    const registeredFaces = await AsyncStorage.getItem(key);

    if (registeredFaces) {
      const storedFaces = JSON.parse(registeredFaces);

      for (const face of storedFaces) {
        if (compareFaces(currentFace, face.keypoints)) {
          setSuccessRegister(1);
          return;
        }
      }
    }

    setSuccessRegister(2);
  };

  const compareFaces = (face1, face2) => {
    // Verifique se os dois rostos têm o mesmo número de pontos-chave
    if (face1.length !== face2.length) {
      console.error('Número diferente de pontos-chave nos rostos.');
      return false;
    }
  
    const numPoints = face1.length;
    const distanceThreshold = 20; // Ajuste conforme necessário
    let totalDistance = 0;
  
    for (let i = 0; i < numPoints; i++) {
      const distance = Math.sqrt(
        Math.pow(face1[i][0] - face2[i][0], 2) + Math.pow(face1[i][1] - face2[i][1], 2)
      );
  
      totalDistance += distance;
    }
  
    const averageDistance = totalDistance / numPoints;
  
    console.log('Distância média:', averageDistance);
  
    // return averageDistance <= dynamicThreshold;
    return averageDistance <= distanceThreshold;
  };

  // const normalizeKeyPoints = (points) => {
  //   // Encontre os valores máximos e mínimos para os eixos x e y
  //   const maxX = Math.max(...points.map(point => point[0]));
  //   const minX = Math.min(...points.map(point => point[0]));
  //   const maxY = Math.max(...points.map(point => point[1]));
  //   const minY = Math.min(...points.map(point => point[1]));
  
  //   // Calcule as diferenças máximas em ambos os eixos
  //   const diffX = maxX - minX;
  //   const diffY = maxY - minY;
  
  //   // Normalize os pontos-chave para que todos estejam na faixa [0, 1]
  //   const normalizedPoints = points.map(point => [
  //     (point[0] - minX) / diffX,
  //     (point[1] - minY) / diffY,
  //   ]);
  
  //   return normalizedPoints;
  // };
  
  // const compareFaces = (face1, face2) => {
  //   if (face1.length !== face2.length) {
  //     console.error('Número diferente de pontos-chave nos rostos.');
  //     return false;
  //   }
  
  //   const numPoints = face1.length;
  //   const distanceThreshold = 0.03; // Ajuste conforme necessário
  //   let totalDistance = 0;
  
  //   // Normalize os pontos-chave antes de calcular as distâncias
  //   const normalizedFace1 = normalizeKeyPoints(face1);
  //   const normalizedFace2 = normalizeKeyPoints(face2);
  
  //   for (let i = 0; i < numPoints; i++) {
  //     const distance = Math.sqrt(
  //       Math.pow(normalizedFace1[i][0] - normalizedFace2[i][0], 2) +
  //       Math.pow(normalizedFace1[i][1] - normalizedFace2[i][1], 2)
  //     );
  
  //     totalDistance += distance;
  //   }
  
  //   const averageDistance = totalDistance / numPoints;
  
  //   console.log('Distância média normalizada:', averageDistance);
  
  //   return averageDistance <= distanceThreshold;
  // };
  

  const drawMesh = () => {
    if (listPredictions.length > 0) {
      return listPredictions.map((prediction, index) => {
        if(index === 0) {

          const keypoints = prediction.scaledMesh;
          const LIMIT_POINTS = 40;
          let count = 40;
          const DIV_252 = 2.5;
          return (
            <Svg key={`mesh-${index}`} height="100%" width="100%" viewBox="0 0 100 100">
              {keypoints.map((point, pointIndex) => {
                const x = point[0] / DIV_252;
                const y = point[1] / DIV_252;

                if(count === LIMIT_POINTS) {
                  count = 0;
                  return (
                    <Circle
                      key={`point-${pointIndex}`}
                      cx={x}
                      cy={y}
                      r={1 /* radius */}
                      fill="green"
                    />
                  );
                }

                count++;
    
              })}
            </Svg>
          );
          
        }
      });
    }
  
    return null;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Face detection</Text>

      <Camera
        style={styles.imageContainer}
        type={type}
        ref={(ref) => setCameraRef(ref)}
      >
      </Camera>

      <View style={styles.imageContainer}>
        {
        loadingPicture ? <ActivityIndicator/> :
        picturePath ? (
          <View style={{flex: 1, width: 252, height: 252}}>
            <ImageBackground source={{ uri: picturePath }} style={styles.imageResult}>
              <View style={{width: 252, height: 252}}>
                {drawMesh()}
              </View>
            </ImageBackground>
          </View>
          
        ) : (
          <Text style={styles.noImageText}>Nenhuma segunda imagem</Text>
        )}
      </View>

      {successResgister === 1 ? 
      <Text style={[styles.successText, {color: 'green'}]}>Usuário validado com sucesso</Text> : 
      successResgister === 2 ? 
      <Text style={[styles.successText, {color: 'red'}]}>Erro ao validar usuário</Text> : null} 
      
      <View style={styles.captureButtonContainer}>
        <TouchableOpacity style={styles.captureButton} onPress={() => {detectFace()}}>
          <Text style={styles.captureButtonText}>Validate Face</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  camera: {
    paddingTop: 40,
    width: 252,
    height: 252
  },
  buttonContainer: {
    justifyContent: 'flex-end',
    alignItems: 'center'
  },
  button: {
    height: 40,
    width: 252,
    backgroundColor: "#00F0F0"
  },
  text: {
    fontSize: 20,
    color: '#000000'
  },
  captureButtonContainer: {
    flex: 0.4,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
    borderRadius: 5,
  },
  captureButton: {
    height: 45,
    width: 252,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'green',
    padding: 10,
    borderRadius: 5,
  },
  captureButtonText: {
    fontSize: 18,
    color: '#FFFFFF'
  },
  imageResult: {
    width: 252, 
    height: 252
  },
  imageContainer: {
    width: 252,
    height: 252,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    overflow: 'hidden',
  },
  noImageText: {
    fontSize: 16,
    color: '#888',
  },
  successText: {
    fontSize: 16,
  }
});

