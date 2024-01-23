import React, { useState } from 'react';
import { View, Text, StyleSheet, Button, Image, ImageBackground, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as tf from '@tensorflow/tfjs';
import * as FileSystem from 'expo-file-system';
import { decodeJpeg } from '@tensorflow/tfjs-react-native';
import * as facemesh from '@tensorflow-models/facemesh';
import Svg, { Circle, Rect } from 'react-native-svg';
import * as ExpoImageManipulator from 'expo-image-manipulator';

// precisa melhorar o uso de memória RAM, conforme o app é utilizado o uso de RAM só aumenta

export default function Home() {
  const [cartoonImage, setCartoonImage] = useState(null);
  const [secondCartoonImage, setSecondCartoonImage] = useState(null);
  const [listPredictions, setListPredictions] = useState([]);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageLoading2, setImageLoading2] = useState(false);

  const handleChooseImage = async () => {
    
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1], // 1:1 aspect ratio
        quality: 1,
      });

      if (!result.canceled) {
        setImageLoading(true);
        await resizeImage(result.assets[0].uri);
        
      }
    } catch (error) {
      console.error('Erro ao escolher a imagem:', error);
    }
  };

  const resizeImage = async (selectedImage) => {
    if (selectedImage) {
      const resizedImage = await ExpoImageManipulator.manipulateAsync(
        selectedImage,
        [{ resize: { width: 252, height: 252 } }],
        { compress: 1, format: ExpoImageManipulator.SaveFormat.JPEG }
      );
      setCartoonImage(resizedImage.uri);
      setSecondCartoonImage(resizedImage.uri);
      setImageLoading(false);
      setImageLoading2(true);
      await handleCreateCartoon(resizedImage.uri);
    }
  };

  const handleCreateCartoon = async (resizedImage) => {
    setListPredictions([]);
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
    setImageLoading2(false);
  };

  const drawMesh = () => {
    if (listPredictions.length > 0) {
      return listPredictions.map((prediction, index) => {
        if(index === 0) {

          const keypoints = prediction.scaledMesh;
          let LIMIT_POINTS = 40;
          const DIV_252 = 2.6;
          return (
            <Svg key={`mesh-${index}`} height="100%" width="100%" viewBox="0 0 100 100">
              {keypoints.map((point, pointIndex) => {
                const x = point[0] / DIV_252;
                const y = point[1] / DIV_252;

                if(LIMIT_POINTS === 40) {
                  LIMIT_POINTS = 0;
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

                LIMIT_POINTS++;
    
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
      <Text style={styles.title}>Facemesh</Text>

      <View style={styles.imageContainer}>
        {
          imageLoading ? <ActivityIndicator/> :
          cartoonImage ? (
            <Image source={{ uri: cartoonImage }} style={styles.imageResult} />
          ) : (
            <Text style={styles.noImageText}>Nenhuma imagem selecionada</Text>
          )
        }
        
      </View>

      <View style={styles.imageContainer}>
        {
        imageLoading2 ? <ActivityIndicator/> :
        secondCartoonImage ? (
          <View style={{flex: 1, width: 252, height: 252}}>
            <ImageBackground source={{ uri: secondCartoonImage }} style={styles.imageResult}>
              <View style={{width: 252, height: 252}}>
                {drawMesh()}
              </View>
            </ImageBackground>
          </View>
          
        ) : (
          <Text style={styles.noImageText}>Nenhuma segunda imagem</Text>
        )}
      </View>

      <View style={styles.buttonContainer}>
        <Button title="Escolher Imagem" onPress={handleChooseImage} disabled={imageLoading || imageLoading2} />
      </View>
    </View>
  );
}

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
  imageResult: {
    width: '100%',
    height: '100%',
  },
  noImageText: {
    fontSize: 16,
    color: '#888',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
});
